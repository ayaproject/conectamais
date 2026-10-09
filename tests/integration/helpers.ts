import { PrismaClient } from "@prisma/client";
import { signUp } from "@/server/services/accounts";
import { grantAdmin } from "@/server/services/admins";
import { loadPrincipal } from "@/server/services/principal";
import type { AdminPermission } from "@/domain/permissions";

export const db = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL ?? "postgresql://conecta:conecta_dev@localhost:5432/conecta_test",
});

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE audit_logs, provider_status_history, provider_profiles, sessions, user_admin_permissions, user_roles, users CASCADE`,
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
