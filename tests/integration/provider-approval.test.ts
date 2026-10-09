import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, resetDb, makeUser, COMPLETE_PROFILE } from "./helpers";
import {
  adminDecideProvider,
  getProviderForAdmin,
  listProvidersForAdmin,
  submitOwnProviderProfile,
  updateOwnProviderProfile,
} from "@/server/services/providers";
import { authenticate, signUp } from "@/server/services/accounts";
import { canOfferServices } from "@/domain/provider-status";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function submittedProvider() {
  const p = await makeUser({ provider: true });
  await updateOwnProviderProfile(db, p.principal, COMPLETE_PROFILE);
  await submitOwnProviderProfile(db, p.principal);
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId: p.user.id } });
  return { ...p, profileId: profile.id };
}

describe("contas", () => {
  it("cadastro comum cria só o papel de cliente", async () => {
    const { principal } = await makeUser();
    expect(principal.roles).toEqual(["CLIENT"]);
    expect(principal.permissions).toEqual([]);
  });

  it("e-mail duplicado é recusado", async () => {
    await signUp(db, { name: "Ana", email: "ana@teste.local", password: "senha-segura-123", asProvider: false });
    await expect(
      signUp(db, { name: "Ana 2", email: "ANA@teste.local", password: "senha-segura-123", asProvider: false }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("login confere senha e não diferencia e-mail inexistente", async () => {
    await signUp(db, { name: "Ana", email: "ana@teste.local", password: "senha-segura-123", asProvider: false });
    expect(await authenticate(db, "ana@teste.local", "senha-segura-123")).not.toBeNull();
    expect(await authenticate(db, "ana@teste.local", "outra-senha-123")).toBeNull();
    expect(await authenticate(db, "ninguem@teste.local", "senha-segura-123")).toBeNull();
  });

  it("senha não é armazenada em texto puro", async () => {
    const { user } = await makeUser();
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).not.toContain("senha-segura-123");
  });
});

describe("cadastro de prestador", () => {
  it("perfil incompleto não pode ser enviado", async () => {
    const { principal } = await makeUser({ provider: true });
    await expect(submitOwnProviderProfile(db, principal)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("cliente sem papel de prestador não acessa a área", async () => {
    const { principal } = await makeUser();
    await expect(updateOwnProviderProfile(db, principal, COMPLETE_PROFILE)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("perfil em análise não pode ser editado", async () => {
    const p = await submittedProvider();
    await expect(updateOwnProviderProfile(db, p.principal, COMPLETE_PROFILE)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("prestador pendente não pode oferecer serviços", async () => {
    const p = await submittedProvider();
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: p.profileId } });
    expect(profile.status).toBe("IN_REVIEW");
    expect(canOfferServices(profile.status)).toBe(false);
  });
});

describe("aprovação administrativa", () => {
  it("fluxo completo: envio, pedido de correção, reenvio e aprovação com histórico e auditoria", async () => {
    const p = await submittedProvider();
    const admin = await makeUser({ admin: ["APPROVE_PROVIDERS"] });

    const queue = await listProvidersForAdmin(db, admin.principal);
    expect(queue.map((q) => q.id)).toEqual([p.profileId]);

    await adminDecideProvider(db, admin.principal, p.profileId, "REQUEST_CHANGES", "Detalhe melhor os serviços.");
    await updateOwnProviderProfile(db, p.principal, { ...COMPLETE_PROFILE, description: COMPLETE_PROFILE.description + " Orçamento grátis." });
    await submitOwnProviderProfile(db, p.principal);
    await adminDecideProvider(db, admin.principal, p.profileId, "APPROVE");

    const profile = await getProviderForAdmin(db, admin.principal, p.profileId);
    expect(profile.status).toBe("APPROVED");
    expect(canOfferServices(profile.status)).toBe(true);
    expect(profile.statusHistory.map((h) => `${h.fromStatus}>${h.toStatus}`).reverse()).toEqual([
      "DRAFT>IN_REVIEW",
      "IN_REVIEW>CHANGES_REQUESTED",
      "CHANGES_REQUESTED>IN_REVIEW",
      "IN_REVIEW>APPROVED",
    ]);
    const approvalAudit = await db.auditLog.findFirst({ where: { action: "provider.approve", entityId: p.profileId } });
    expect(approvalAudit?.actorId).toBe(admin.user.id);
  });

  it("usuário sem APPROVE_PROVIDERS não vê a fila nem decide", async () => {
    const p = await submittedProvider();
    const client = await makeUser();
    const auditor = await makeUser({ admin: ["READ_AUDIT_LOG"] });
    for (const who of [client, auditor, p]) {
      await expect(listProvidersForAdmin(db, who.principal)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(adminDecideProvider(db, who.principal, p.profileId, "APPROVE")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: p.profileId } });
    expect(profile.status).toBe("IN_REVIEW");
  });

  it("permissão de aprovar não permite suspender", async () => {
    const p = await submittedProvider();
    const admin = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    await adminDecideProvider(db, admin.principal, p.profileId, "APPROVE");
    await expect(adminDecideProvider(db, admin.principal, p.profileId, "SUSPEND", "x")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("transição inválida é recusada pelo servidor", async () => {
    const { user } = await makeUser({ provider: true });
    const admin = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    const draft = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id } });
    await expect(adminDecideProvider(db, admin.principal, draft.id, "APPROVE")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("rejeição sem motivo é recusada", async () => {
    const p = await submittedProvider();
    const admin = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    await expect(adminDecideProvider(db, admin.principal, p.profileId, "REJECT", "")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("admin não analisa o próprio cadastro", async () => {
    const p = await submittedProvider();
    const { grantAdmin } = await import("@/server/services/admins");
    await grantAdmin(db, p.user.email, ["APPROVE_PROVIDERS"], null);
    const { loadPrincipal } = await import("@/server/services/principal");
    const self = (await loadPrincipal(db, p.user.id))!;
    await expect(adminDecideProvider(db, self, p.profileId, "APPROVE")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("duas decisões simultâneas: só uma é aplicada", async () => {
    const p = await submittedProvider();
    const a1 = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    const a2 = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    const results = await Promise.allSettled([
      adminDecideProvider(db, a1.principal, p.profileId, "APPROVE"),
      adminDecideProvider(db, a2.principal, p.profileId, "REJECT", "Documentação insuficiente"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const history = await db.providerStatusHistory.findMany({ where: { providerId: p.profileId, fromStatus: "IN_REVIEW" } });
    expect(history).toHaveLength(1);
  });
});
