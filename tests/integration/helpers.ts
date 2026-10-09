import { PrismaClient } from "@prisma/client";
import { signUp } from "@/server/services/accounts";
import { grantAdmin } from "@/server/services/admins";
import { loadPrincipal } from "@/server/services/principal";
import type { AdminPermission, Principal } from "@/domain/permissions";
import type { FileStorage } from "@/server/storage";
import { uploadOwnDocument } from "@/server/services/verification";

export const db = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_test",
});

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE audit_logs, verification_badge_events, verification_documents, provider_status_history, provider_profiles, sessions, user_admin_permissions, user_roles, users CASCADE`,
  );
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
