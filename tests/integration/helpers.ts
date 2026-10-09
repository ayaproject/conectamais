import { PrismaClient } from "@prisma/client";
import { signUp } from "@/server/services/accounts";
import { grantAdmin } from "@/server/services/admins";
import { loadPrincipal } from "@/server/services/principal";
import type { AdminPermission, Principal } from "@/domain/permissions";
import type { FileStorage } from "@/server/storage";
import { uploadOwnDocument } from "@/server/services/verification";
import { seedCatalog } from "@/server/catalog-seed";

export const db = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_test",
});

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE service_cities, services, categories, cities, audit_logs, verification_badge_events, verification_documents, provider_status_history, provider_profiles, sessions, user_admin_permissions, user_roles, users CASCADE`,
  );
  await seedCatalog(db);
}

let n = 0;
export async function makeUser(opts: { provider?: boolean; admin?: AdminPermission[] } = {}) {
  const user = await signUp(db, {
    name: `Pessoa ${++n}`,
    email: `pessoa${n}-${Date.now()}@teste.local`,
    password: "senha-segura-123",
    asProvider: !!opts.provider,
  });
  if (opts.admin?.length) await grantAdmin(db, user.email, opts.admin, null);
  const principal = (await loadPrincipal(db, user.id))!;
  return { user, principal };
}

export const COMPLETE_PROFILE = {
  kind: "INDIVIDUAL",
  legalName: "Maria da Silva",
  displayName: "Maria Pinturas",
  description: "Pintura residencial interna e externa, com acabamento e limpeza.",
  experience: "10 anos",
  city: "Imbituba",
  state: "sc",
  website: "",
  googleBusinessUrl: "",
};

// Armazenamento em memória para testes.
export class MemoryStorage implements FileStorage {
  files = new Map<string, Buffer>();
  async put(key: string, bytes: Uint8Array) {
    if (this.files.has(key)) throw new Error("já existe");
    this.files.set(key, Buffer.from(bytes));
  }
  async get(key: string) {
    const f = this.files.get(key);
    if (!f) throw new Error("não encontrado");
    return f;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

export const storage = new MemoryStorage();

export const PDF = new Uint8Array(Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"));

export function uploadDoc(principal: Principal, requirement: string, type: string, bytes: Uint8Array = PDF) {
  return uploadOwnDocument(db, storage, principal, { requirement, type, fileName: "doc.pdf", bytes });
}

// Prestador aprovado (perfil completo, documento aceito e aprovação do admin).
export async function approvedProvider(displayName = "Maria Pinturas") {
  const { updateOwnProviderProfile, submitOwnProviderProfile, adminDecideProvider } = await import("@/server/services/providers");
  const { reviewDocument } = await import("@/server/services/verification");
  const p = await makeUser({ provider: true });
  await updateOwnProviderProfile(db, p.principal, { ...COMPLETE_PROFILE, displayName });
  await uploadDoc(p.principal, "PERSON_ID", "RG");
  await submitOwnProviderProfile(db, p.principal);
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId: p.user.id } });
  const admin = await makeUser({ admin: ["VERIFY_DOCUMENTS", "APPROVE_PROVIDERS", "SUSPEND_PROVIDERS"] });
  const docs = await db.verificationDocument.findMany({ where: { providerId: profile.id, status: "PENDING" } });
  for (const d of docs) await reviewDocument(db, admin.principal, d.id, "ACCEPT");
  await adminDecideProvider(db, admin.principal, profile.id, "APPROVE", "");
  return { ...p, profileId: profile.id, admin };
}
