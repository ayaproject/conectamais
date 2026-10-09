import { createHash, randomUUID } from "node:crypto";
import type { Db } from "../db";
import type { FileStorage } from "../storage";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { hasPermission, hasRole, type Principal } from "@/domain/permissions";
import { canEditProfile } from "@/domain/provider-status";
import { checkDocumentFile, sanitizeFileName } from "@/domain/file-validation";
import {
  allDocumentsAccepted,
  badgeExpiry,
  currentDocument,
  findRequirement,
  isBadgeActive,
  matchesRequirement,
  REQUIREMENTS,
  type DocumentType,
} from "@/domain/verification";

function canSeeDocuments(p: Principal) {
  return hasPermission(p, "VERIFY_DOCUMENTS") || hasPermission(p, "APPROVE_PROVIDERS");
}

// ---------------------------------------------------------------- prestador

export async function uploadOwnDocument(
  db: Db,
  storage: FileStorage,
  principal: Principal,
  input: { requirement: string; type: string; fileName: string; bytes: Uint8Array },
) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
  const profile = await db.providerProfile.findUnique({
    where: { userId: principal.userId },
    select: { id: true, kind: true, status: true },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  if (!canEditProfile(profile.status)) {
    throw new DomainError("INVALID_TRANSITION", "Documentos não podem ser enviados no status atual do cadastro.");
  }
  const req = findRequirement(profile.kind, input.requirement);
  if (!req) throw new DomainError("INVALID_INPUT", "Este documento não é exigido para o seu tipo de cadastro.");
  if (!req.acceptedTypes.includes(input.type as DocumentType)) {
    throw new DomainError("INVALID_INPUT", "Tipo de documento inválido para este item.");
  }
  const check = checkDocumentFile(input.bytes);
  if (!check.ok) throw new DomainError("INVALID_INPUT", check.error);

  const storageKey = `docs/${profile.id}/${randomUUID()}.${check.ext}`.toLowerCase();
  await storage.put(storageKey, input.bytes);
  try {
    return await db.$transaction(async (tx) => {
      // Revalida o status dentro da transação: o cadastro pode ter sido enviado nesse meio-tempo.
      const fresh = await tx.providerProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { status: true } });
      if (!canEditProfile(fresh.status)) {
        throw new DomainError("CONFLICT", "O cadastro mudou de status. Recarregue a página.");
      }
      const previous = await tx.verificationDocument.findMany({
        where: { providerId: profile.id, subject: req.subject, type: { in: [...req.acceptedTypes] }, status: { not: "SUPERSEDED" } },
        select: { id: true },
      });
      if (previous.length) {
        await tx.verificationDocument.updateMany({
          where: { id: { in: previous.map((d) => d.id) } },
          data: { status: "SUPERSEDED" },
        });
      }
      const doc = await tx.verificationDocument.create({
        data: {
          providerId: profile.id,
          type: input.type as DocumentType,
          subject: req.subject,
          storageKey,
          originalName: sanitizeFileName(input.fileName),
          mimeType: check.mime,
          sizeBytes: input.bytes.length,
          sha256: createHash("sha256").update(input.bytes).digest("hex"),
        },
        select: { id: true },
      });
      await audit(tx, {
        actorId: principal.userId,
        action: "document.uploaded",
        entityType: "VerificationDocument",
        entityId: doc.id,
        details: { providerId: profile.id, type: input.type, subject: req.subject, superseded: previous.map((d) => d.id) },
      });
      return doc.id;
    });
  } catch (e) {
    await storage.delete(storageKey).catch(() => {});
    throw e;
  }
}

export async function getOwnVerification(db: Db, principal: Principal) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
  const profile = await db.providerProfile.findUnique({
    where: { userId: principal.userId },
    select: {
      id: true,
      kind: true,
      status: true,
      verifiedUntil: true,
      documents: {
        where: { status: { not: "SUPERSEDED" } },
        select: { id: true, type: true, subject: true, status: true, uploadedAt: true, originalName: true, reviewNote: true },
      },
    },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  return {
    items: REQUIREMENTS[profile.kind].map((req) => ({ requirement: req, document: currentDocument(profile.documents, req) ?? null })),
    badgeActive: isBadgeActive(profile),
    verifiedUntil: profile.verifiedUntil,
  };
}

// ------------------------------------------------------- leitura do arquivo

// Só o dono e administradores com permissão podem abrir o arquivo. Todo acesso é auditado.
export async function readDocumentFile(db: Db, storage: FileStorage, principal: Principal, documentId: string) {
  const doc = await db.verificationDocument.findUnique({
    where: { id: documentId },
    select: { id: true, storageKey: true, mimeType: true, originalName: true, provider: { select: { userId: true } } },
  });
  // Mesmo erro para inexistente e sem permissão: não revela quais documentos existem.
  if (!doc || (doc.provider.userId !== principal.userId && !canSeeDocuments(principal))) {
    throw new DomainError("NOT_FOUND", "Documento não encontrado.");
  }
  const bytes = await storage.get(doc.storageKey);
  await db.$transaction((tx) =>
    audit(tx, { actorId: principal.userId, action: "document.viewed", entityType: "VerificationDocument", entityId: doc.id }),
  );
  return { bytes, mimeType: doc.mimeType, fileName: doc.originalName };
}

// ------------------------------------------------------------------- admin

export async function reviewDocument(
  db: Db,
  principal: Principal,
  documentId: string,
  decision: "ACCEPT" | "REJECT",
  note?: string | null,
) {
  if (!hasPermission(principal, "VERIFY_DOCUMENTS")) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para analisar documentos.");
  }
  const reason = note?.trim() || null;
  if (decision === "REJECT" && !reason) throw new DomainError("INVALID_INPUT", "Informe o motivo da recusa do documento.");

  return db.$transaction(async (tx) => {
    const doc = await tx.verificationDocument.findUnique({
      where: { id: documentId },
      select: { id: true, status: true, provider: { select: { id: true, userId: true, status: true } } },
    });
    if (!doc) throw new DomainError("NOT_FOUND", "Documento não encontrado.");
    if (doc.provider.userId === principal.userId) {
      throw new DomainError("FORBIDDEN", "Um administrador não pode analisar os próprios documentos.");
    }
    if (doc.provider.status !== "IN_REVIEW") {
      throw new DomainError("INVALID_TRANSITION", "Documentos só são analisados com o cadastro em análise.");
    }
    const res = await tx.verificationDocument.updateMany({
      where: { id: doc.id, status: "PENDING" },
      data: {
        status: decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        reviewNote: reason,
        reviewedById: principal.userId,
        reviewedAt: new Date(),
      },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "Este documento já foi analisado. Recarregue a página.");
    await audit(tx, {
      actorId: principal.userId,
      action: decision === "ACCEPT" ? "document.accepted" : "document.rejected",
      entityType: "VerificationDocument",
      entityId: doc.id,
      details: { providerId: doc.provider.id, note: reason },
    });
  });
}

export async function grantBadge(db: Db, principal: Principal, providerId: string, note?: string | null) {
  if (!hasPermission(principal, "VERIFY_DOCUMENTS")) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para conceder o selo.");
  }
  return db.$transaction(async (tx) => {
    const p = await tx.providerProfile.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        userId: true,
        kind: true,
        status: true,
        verifiedUntil: true,
        documents: {
          where: { status: { not: "SUPERSEDED" } },
          select: { id: true, type: true, subject: true, status: true, uploadedAt: true },
        },
      },
    });
    if (!p) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");
    if (p.userId === principal.userId) throw new DomainError("FORBIDDEN", "Um administrador não pode verificar o próprio cadastro.");
    if (p.status !== "APPROVED") throw new DomainError("INVALID_TRANSITION", "O selo só pode ser concedido a prestadores aprovados.");
    if (!allDocumentsAccepted(p.kind, p.documents)) {
      throw new DomainError("INVALID_TRANSITION", "Todos os documentos exigidos precisam estar aceitos.");
    }
    if (isBadgeActive(p)) throw new DomainError("CONFLICT", "O prestador já possui o selo válido.");

    const now = new Date();
    const validUntil = badgeExpiry(now);
    const criteria = REQUIREMENTS[p.kind].map((req) => {
      const d = currentDocument(p.documents, req)!;
      return { requirement: req.key, documentId: d.id, type: d.type };
    });
    const res = await tx.providerProfile.updateMany({
      where: { id: p.id, status: "APPROVED", verifiedUntil: p.verifiedUntil },
      data: { verifiedAt: now, verifiedUntil: validUntil },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O cadastro foi alterado por outra pessoa. Recarregue a página.");
    await tx.verificationBadgeEvent.create({
      data: { providerId: p.id, decision: "GRANTED", criteria, validUntil, note: note?.trim() || null, actorId: principal.userId },
    });
    await audit(tx, {
      actorId: principal.userId,
      action: "badge.granted",
      entityType: "ProviderProfile",
      entityId: p.id,
      details: { validUntil: validUntil.toISOString(), criteria },
    });
    return validUntil;
  });
}

export async function revokeBadge(db: Db, principal: Principal, providerId: string, note: string) {
  if (!hasPermission(principal, "VERIFY_DOCUMENTS")) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para remover o selo.");
  }
  const reason = note?.trim();
  if (!reason) throw new DomainError("INVALID_INPUT", "Informe o motivo da remoção do selo.");
  return db.$transaction(async (tx) => {
    const p = await tx.providerProfile.findUnique({
      where: { id: providerId },
      select: { id: true, userId: true, verifiedUntil: true },
    });
    if (!p) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");
    if (p.userId === principal.userId) throw new DomainError("FORBIDDEN", "Um administrador não pode alterar o próprio selo.");
    if (!p.verifiedUntil || p.verifiedUntil <= new Date()) throw new DomainError("INVALID_TRANSITION", "O prestador não possui selo válido.");
    const res = await tx.providerProfile.updateMany({
      where: { id: p.id, verifiedUntil: p.verifiedUntil },
      data: { verifiedUntil: null },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O cadastro foi alterado por outra pessoa. Recarregue a página.");
    await tx.verificationBadgeEvent.create({
      data: { providerId: p.id, decision: "REVOKED", criteria: [], note: reason, actorId: principal.userId },
    });
    await audit(tx, {
      actorId: principal.userId,
      action: "badge.revoked",
      entityType: "ProviderProfile",
      entityId: p.id,
      details: { reason },
    });
  });
}

export async function getVerificationForAdmin(db: Db, principal: Principal, providerId: string) {
  if (!canSeeDocuments(principal)) throw new DomainError("FORBIDDEN", "Você não tem permissão para ver documentos.");
  const p = await db.providerProfile.findUnique({
    where: { id: providerId },
    select: {
      kind: true,
      status: true,
      verifiedAt: true,
      verifiedUntil: true,
      documents: {
        where: { status: { not: "SUPERSEDED" } },
        select: {
          id: true,
          type: true,
          subject: true,
          status: true,
          uploadedAt: true,
          originalName: true,
          sizeBytes: true,
          reviewNote: true,
          reviewedAt: true,
          reviewedBy: { select: { name: true } },
        },
      },
      badgeHistory: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!p) throw new DomainError("NOT_FOUND", "Cadastro não encontrado.");
  return {
    items: REQUIREMENTS[p.kind].map((req) => ({
      requirement: req,
      document: p.documents.find((d) => d === currentDocument(p.documents, req)) ?? null,
    })),
    extraDocuments: p.documents.filter((d) => !REQUIREMENTS[p.kind].some((r) => matchesRequirement(d, r))),
    allAccepted: allDocumentsAccepted(p.kind, p.documents),
    badgeActive: isBadgeActive(p),
    verifiedAt: p.verifiedAt,
    verifiedUntil: p.verifiedUntil,
    badgeHistory: p.badgeHistory,
  };
}
