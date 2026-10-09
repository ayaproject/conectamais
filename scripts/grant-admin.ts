// Uso: npm run admin:grant -- email@exemplo.com APPROVE_PROVIDERS SUSPEND_PROVIDERS
// A conta precisa existir (crie pelo site). Fica registrado na auditoria como ação do sistema.
import { PrismaClient } from "@prisma/client";
import { grantAdmin } from "../src/server/services/admins";
import type { AdminPermission } from "../src/domain/permissions";

const [email, ...perms] = process.argv.slice(2);
if (!email || perms.length === 0) {
  console.error("Uso: npm run admin:grant -- <email> <PERMISSAO> [PERMISSAO...]");
  process.exit(1);
}
const db = new PrismaClient();
grantAdmin(db, email, perms as AdminPermission[], null)
  .then(() => console.log(`Permissões concedidas a ${email}: ${perms.join(", ")}`))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
