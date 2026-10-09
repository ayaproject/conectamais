import type { Db } from "../db";
import type { Principal } from "@/domain/permissions";

export async function loadPrincipal(db: Db, userId: string): Promise<Principal | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, roles: { select: { role: true } }, adminPermissions: { select: { permission: true } } },
  });
  if (!user) return null;
  return {
    userId: user.id,
    roles: user.roles.map((r) => r.role),
    permissions: user.adminPermissions.map((p) => p.permission),
  };
}
