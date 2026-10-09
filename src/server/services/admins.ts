import type { Db } from "../db";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@/domain/permissions";

// Concede o papel ADMIN e permissões a uma conta existente.
// Usado pelo script de linha de comando; não existe tela pública para isso.
export async function grantAdmin(db: Db, email: string, permissions: AdminPermission[], grantedBy: string | null) {
  const invalid = permissions.filter((p) => !ADMIN_PERMISSIONS.includes(p));
  if (invalid.length || permissions.length === 0) {
    throw new DomainError("INVALID_INPUT", `Permissões inválidas: ${invalid.join(", ") || "(nenhuma)"}`);
  }
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
    if (!user) throw new DomainError("NOT_FOUND", `Nenhuma conta com o e-mail ${email}.`);
    await tx.userRole.upsert({
      where: { userId_role: { userId: user.id, role: "ADMIN" } },
      create: { userId: user.id, role: "ADMIN" },
      update: {},
    });
    for (const permission of permissions) {
      await tx.userAdminPermission.upsert({
        where: { userId_permission: { userId: user.id, permission } },
        create: { userId: user.id, permission, grantedBy },
        update: {},
      });
    }
    await audit(tx, {
      actorId: grantedBy,
      action: "admin.permissions_granted",
      entityType: "User",
      entityId: user.id,
      details: { permissions },
    });
    return user.id;
  });
}
