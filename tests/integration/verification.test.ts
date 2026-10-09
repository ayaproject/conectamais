import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, resetDb, makeUser, COMPLETE_PROFILE, uploadDoc, storage, PDF } from "./helpers";
import { adminDecideProvider, submitOwnProviderProfile, updateOwnProviderProfile } from "@/server/services/providers";
import {
  getOwnVerification,
  grantBadge,
  readDocumentFile,
  reviewDocument,
  revokeBadge,
} from "@/server/services/verification";
import { isBadgeActive } from "@/domain/verification";

beforeEach(async () => {
  await resetDb();
  storage.files.clear();
});
afterAll(() => db.$disconnect());

async function provider(kind: "INDIVIDUAL" | "COMPANY" = "INDIVIDUAL") {
  const p = await makeUser({ provider: true });
  await updateOwnProviderProfile(db, p.principal, { ...COMPLETE_PROFILE, kind });
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId: p.user.id } });
  return { ...p, profileId: profile.id };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("envio de documentos", () => {
  it("pessoa física pode enviar RG ou CNH, mas não documentos de empresa", async () => {
    const p = await provider();
    await uploadDoc(p.principal, "PERSON_ID", "CNH", PNG);
    await expect(uploadDoc(p.principal, "COMPANY_CNPJ", "CNPJ_CARD")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(uploadDoc(p.principal, "PERSON_ID", "CNPJ_CARD")).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("arquivo que não é PDF, JPG ou PNG é recusado, independentemente do nome", async () => {
    const p = await provider();
    const html = new Uint8Array(Buffer.from("<html><script>alert(1)</script></html>"));
    await expect(uploadDoc(p.principal, "PERSON_ID", "RG", html)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(storage.files.size).toBe(0);
  });

  it("novo envio substitui o anterior", async () => {
    const p = await provider();
    const first = await uploadDoc(p.principal, "PERSON_ID", "RG");
    const second = await uploadDoc(p.principal, "PERSON_ID", "CNH", PNG);
    const docs = await db.verificationDocument.findMany({ where: { providerId: p.profileId } });
    expect(docs.find((d) => d.id === first)?.status).toBe("SUPERSEDED");
    expect(docs.find((d) => d.id === second)?.status).toBe("PENDING");
    const v = await getOwnVerification(db, p.principal);
    expect(v.items[0].document?.id).toBe(second);
  });

  it("pessoa física só envia para análise com documento de identidade", async () => {
    const p = await provider();
    await expect(submitOwnProviderProfile(db, p.principal)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await uploadDoc(p.principal, "PERSON_ID", "RG");
    await submitOwnProviderProfile(db, p.principal);
  });

  it("empresa precisa dos documentos da empresa e do dono", async () => {
    const p = await provider("COMPANY");
    await uploadDoc(p.principal, "COMPANY_CNPJ", "CNPJ_CARD");
    await uploadDoc(p.principal, "COMPANY_ACT", "COMPANY_ACT");
    await expect(submitOwnProviderProfile(db, p.principal)).rejects.toThrow(/identidade do dono/);
    await uploadDoc(p.principal, "PERSON_ID", "RG");
    await submitOwnProviderProfile(db, p.principal);
  });

  it("não é possível enviar documentos com o cadastro em análise", async () => {
    const p = await provider();
    await uploadDoc(p.principal, "PERSON_ID", "RG");
    await submitOwnProviderProfile(db, p.principal);
    await expect(uploadDoc(p.principal, "PERSON_ID", "CNH", PNG)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });
});

describe("análise de documentos", () => {
  async function inReview() {
    const p = await provider();
    const docId = await uploadDoc(p.principal, "PERSON_ID", "RG");
    await submitOwnProviderProfile(db, p.principal);
    return { ...p, docId };
  }

  it("aprovação exige documentos aceitos", async () => {
    const p = await inReview();
    const approver = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    const verifier = await makeUser({ admin: ["VERIFY_DOCUMENTS"] });
    await expect(adminDecideProvider(db, approver.principal, p.profileId, "APPROVE")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await reviewDocument(db, verifier.principal, p.docId, "ACCEPT");
    await adminDecideProvider(db, approver.principal, p.profileId, "APPROVE");
  });

  it("separação de permissões: aprovar cadastro não permite aceitar documento", async () => {
    const p = await inReview();
    const approver = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    await expect(reviewDocument(db, approver.principal, p.docId, "ACCEPT")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recusa exige motivo; prestador reenvia após pedido de correção", async () => {
    const p = await inReview();
    const admin = await makeUser({ admin: ["VERIFY_DOCUMENTS", "APPROVE_PROVIDERS"] });
    await expect(reviewDocument(db, admin.principal, p.docId, "REJECT", "")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await reviewDocument(db, admin.principal, p.docId, "REJECT", "Foto ilegível");
    await expect(reviewDocument(db, admin.principal, p.docId, "ACCEPT")).rejects.toMatchObject({ code: "CONFLICT" });
    await adminDecideProvider(db, admin.principal, p.profileId, "REQUEST_CHANGES", "Reenvie o documento");
    await expect(submitOwnProviderProfile(db, p.principal)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    const newDoc = await uploadDoc(p.principal, "PERSON_ID", "CNH", PNG);
    await submitOwnProviderProfile(db, p.principal);
    await reviewDocument(db, admin.principal, newDoc, "ACCEPT");
    await adminDecideProvider(db, admin.principal, p.profileId, "APPROVE");
  });

  it("só o dono e admins autorizados abrem o arquivo, e o acesso é auditado", async () => {
    const p = await inReview();
    const other = await provider();
    const client = await makeUser();
    const admin = await makeUser({ admin: ["VERIFY_DOCUMENTS"] });
    const auditor = await makeUser({ admin: ["READ_AUDIT_LOG"] });

    const own = await readDocumentFile(db, storage, p.principal, p.docId);
    expect(Buffer.from(own.bytes).equals(Buffer.from(PDF))).toBe(true);
    expect(own.mimeType).toBe("application/pdf");

    for (const who of [other, client, auditor]) {
      await expect(readDocumentFile(db, storage, who.principal, p.docId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    await readDocumentFile(db, storage, admin.principal, p.docId);
    const views = await db.auditLog.findMany({ where: { action: "document.viewed", entityId: p.docId } });
    expect(views.map((v) => v.actorId).sort()).toEqual([admin.user.id, p.user.id].sort());
  });
});

describe("selo de prestador verificado", () => {
  async function approved() {
    const p = await provider();
    const docId = await uploadDoc(p.principal, "PERSON_ID", "RG");
    await submitOwnProviderProfile(db, p.principal);
    const admin = await makeUser({ admin: ["VERIFY_DOCUMENTS", "APPROVE_PROVIDERS", "SUSPEND_PROVIDERS"] });
    await reviewDocument(db, admin.principal, docId, "ACCEPT");
    return { ...p, docId, admin };
  }

  it("só é concedido a prestador aprovado, com validade, critérios e responsável", async () => {
    const p = await approved();
    await expect(grantBadge(db, p.admin.principal, p.profileId)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await adminDecideProvider(db, p.admin.principal, p.profileId, "APPROVE");

    const until = await grantBadge(db, p.admin.principal, p.profileId, "Documentos conferidos");
    const months = (until.getFullYear() - new Date().getFullYear()) * 12 + until.getMonth() - new Date().getMonth();
    expect(months).toBe(12);

    const event = await db.verificationBadgeEvent.findFirstOrThrow({ where: { providerId: p.profileId } });
    expect(event).toMatchObject({ decision: "GRANTED", actorId: p.admin.user.id });
    expect(event.criteria).toEqual([{ requirement: "PERSON_ID", documentId: p.docId, type: "RG" }]);
    await expect(grantBadge(db, p.admin.principal, p.profileId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("remoção exige motivo e fica no histórico", async () => {
    const p = await approved();
    await adminDecideProvider(db, p.admin.principal, p.profileId, "APPROVE");
    await grantBadge(db, p.admin.principal, p.profileId);
    await expect(revokeBadge(db, p.admin.principal, p.profileId, " ")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await revokeBadge(db, p.admin.principal, p.profileId, "Documento vencido");
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: p.profileId } });
    expect(isBadgeActive(profile)).toBe(false);
    const events = await db.verificationBadgeEvent.findMany({ where: { providerId: p.profileId }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.decision)).toEqual(["GRANTED", "REVOKED"]);
  });

  it("selo deixa de valer se o prestador for suspenso", async () => {
    const p = await approved();
    await adminDecideProvider(db, p.admin.principal, p.profileId, "APPROVE");
    await grantBadge(db, p.admin.principal, p.profileId);
    await adminDecideProvider(db, p.admin.principal, p.profileId, "SUSPEND", "Denúncia em apuração");
    const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: p.profileId } });
    expect(isBadgeActive(profile)).toBe(false);
  });

  it("sem VERIFY_DOCUMENTS não concede selo", async () => {
    const p = await approved();
    await adminDecideProvider(db, p.admin.principal, p.profileId, "APPROVE");
    const approver = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    await expect(grantBadge(db, approver.principal, p.profileId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
