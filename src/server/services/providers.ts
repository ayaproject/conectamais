import type { Db } from "../db";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { hasPermission, hasRole, type AdminPermission, type Principal } from "@/domain/permissions";
import {
  canEditProfile,
  checkProviderTransition,
  type ActorKind,
  type ProviderAction,
  type ProviderStatus,
} from "@/domain/provider-status";
import { missingForSubmission, providerProfileSchema, type ProviderProfileInput } from "@/domain/provider-profile";

const ADMIN_ACTION_PERMISSION: Partial<Record<ProviderAction, AdminPermission>> = {
  APPROVE: "APPROVE_PROVIDERS",
  REQUEST_CHANGES: "APPROVE_PROVIDERS",
  REJECT: "APPROVE_PROVIDERS",
  SUSPEND: "SUSPEND_PROVIDERS",
  REINSTATE: "SUSPEND_PROVIDERS",
  DEACTIVATE: "SUSPEND_PROVIDERS",
};

const TRANSITION_ERRORS = {
  INVALID_TRANSITION: "Esta ação não é permitida no status atual do cadastro.",
  FORBIDDEN_ACTOR: "Você não tem permissão para esta ação.",
  REASON_REQUIRED: "Informe o motivo.",
} as const;

function requireProviderRole(principal: Principal) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
}

export async function getOwnProviderProfile(db: Db, principal: Principal) {
  requireProviderRole(principal);
  const profile = await db.providerProfile.findUnique({
    where: { userId: principal.userId },
    include: { statusHistory: { orderBy: { createdAt: "desc" }, take: 10 } },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  return profile;
}

export async function updateOwnProviderProfile(db: Db, principal: Principal, input: unknown) {
  requireProviderRole(principal);
  const parsed = providerProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("INVALID_INPUT", parsed.error.issues.map((i) => i.message).join(" "));
  }
  const data: ProviderProfileInput = parsed.data;
  return db.$transaction(async (tx) => {
    const current = await tx.providerProfile.findUnique({
      where: { userId: principal.userId },
      select: { id: true, status: true },
    });
    if (!current) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
    if (!canEditProfile(current.status)) {
      throw new DomainError("INVALID_TRANSITION", "O perfil não pode ser editado no status atual.");
    }
    // A condição de status no where evita editar um perfil que acabou de ir para análise.
    const res = await tx.providerProfile.updateMany({
      where: { id: current.id, status: current.status },
      data: {
        ...data,
        website: data.website || null,
        googleBusinessUrl: data.googleBusinessUrl || null,
      },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O perfil mudou enquanto você editava. Recarregue a página.");
    await audit(tx, {
      actorId: principal.userId,
      action: "provider.profile_updated",
      entityType: "ProviderProfile",
      entityId: current.id,
    });
    return current.id;
  });
}

// Aplica uma transição de status de forma atômica: confere a regra, atualiza só se
// o status ainda for o lido (evita corrida entre dois admins), grava histórico e auditoria.
async function applyTransition(
  db: Db,
  args: { providerId: string; action: ProviderAction; actor: ActorKind; actorId: string; reason?: string | null },
) {
  return db.$transaction(async (tx) => {
    const profile = await tx.providerProfile.findUnique({ where: { id: args.providerId } });
    if (!profile) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");

    const check = checkProviderTransition(profile.status, args.action, args.actor, args.reason);
    if (!check.ok) {
      throw new DomainError(
        check.error === "FORBIDDEN_ACTOR" ? "FORBIDDEN" : check.error === "REASON_REQUIRED" ? "INVALID_INPUT" : "INVALID_TRANSITION",
        TRANSITION_ERRORS[check.error],
      );
    }

    if (args.action === "SUBMIT") {
      const missing = missingForSubmission({
        ...profile,
        website: profile.website ?? "",
        googleBusinessUrl: profile.googleBusinessUrl ?? "",
      });
      if (missing.length) throw new DomainError("INVALID_INPUT", `Complete o perfil antes de enviar: ${missing.join(" ")}`);
    }

    const now = new Date();
    const res = await tx.providerProfile.updateMany({
      where: { id: profile.id, status: profile.status },
      data: {
        status: check.to,
        ...(args.action === "SUBMIT" ? { submittedAt: now } : {}),
        ...(args.actor === "ADMIN" ? { reviewedAt: now } : {}),
      },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O cadastro foi alterado por outra pessoa. Recarregue a página.");

    const reason = args.reason?.trim() || null;
    await tx.providerStatusHistory.create({
      data: { providerId: profile.id, fromStatus: profile.status, toStatus: check.to, reason, actorId: args.actorId },
    });
    await audit(tx, {
      actorId: args.actorId,
      action: `provider.${args.action.toLowerCase()}`,
      entityType: "ProviderProfile",
      entityId: profile.id,
      details: { from: profile.status, to: check.to, reason },
    });
    return { from: profile.status as ProviderStatus, to: check.to };
  });
}

export async function submitOwnProviderProfile(db: Db, principal: Principal) {
  requireProviderRole(principal);
  const profile = await db.providerProfile.findUnique({ where: { userId: principal.userId }, select: { id: true } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  return applyTransition(db, { providerId: profile.id, action: "SUBMIT", actor: "OWNER", actorId: principal.userId });
}

export async function deactivateOwnProviderProfile(db: Db, principal: Principal) {
  requireProviderRole(principal);
  const profile = await db.providerProfile.findUnique({ where: { userId: principal.userId }, select: { id: true } });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  return applyTransition(db, { providerId: profile.id, action: "DEACTIVATE", actor: "OWNER", actorId: principal.userId });
}

export async function adminDecideProvider(
  db: Db,
  principal: Principal,
  providerId: string,
  action: ProviderAction,
  reason?: string | null,
) {
  const permission = ADMIN_ACTION_PERMISSION[action];
  if (!permission || !hasPermission(principal, permission)) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para esta ação.");
  }
  const target = await db.providerProfile.findUnique({ where: { id: providerId }, select: { userId: true } });
  if (!target) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");
  if (target.userId === principal.userId) {
    throw new DomainError("FORBIDDEN", "Um administrador não pode analisar o próprio cadastro.");
  }
  return applyTransition(db, { providerId, action, actor: "ADMIN", actorId: principal.userId, reason });
}

function requireAnyProviderAdmin(principal: Principal) {
  if (!hasPermission(principal, "APPROVE_PROVIDERS") && !hasPermission(principal, "SUSPEND_PROVIDERS")) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para acessar os cadastros de prestadores.");
  }
}

export async function listProvidersForAdmin(db: Db, principal: Principal, status: ProviderStatus = "IN_REVIEW") {
  requireAnyProviderAdmin(principal);
  return db.providerProfile.findMany({
    where: { status },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
    take: 100,
    select: {
      id: true,
      displayName: true,
      city: true,
      state: true,
      kind: true,
      status: true,
      submittedAt: true,
      user: { select: { email: true } },
    },
  });
}

export async function getProviderForAdmin(db: Db, principal: Principal, providerId: string) {
  requireAnyProviderAdmin(principal);
  const profile = await db.providerProfile.findUnique({
    where: { id: providerId },
    include: {
      user: { select: { email: true, name: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");
  return profile;
}
