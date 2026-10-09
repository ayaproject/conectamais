// Papéis e permissões administrativas. Regra pura, usada pela camada de acesso.

export type Role = "CLIENT" | "PROVIDER" | "ADMIN";
export type AdminPermission =
  | "APPROVE_PROVIDERS"
  | "SUSPEND_PROVIDERS"
  | "VERIFY_DOCUMENTS"
  | "READ_AUDIT_LOG"
  | "MANAGE_ADMINS";

export type Principal = {
  userId: string;
  roles: readonly Role[];
  permissions: readonly AdminPermission[];
};

export function hasRole(p: Principal, role: Role): boolean {
  return p.roles.includes(role);
}

// Permissão administrativa só vale para quem também tem o papel ADMIN.
export function hasPermission(p: Principal, permission: AdminPermission): boolean {
  return hasRole(p, "ADMIN") && p.permissions.includes(permission);
}

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  "APPROVE_PROVIDERS",
  "SUSPEND_PROVIDERS",
  "VERIFY_DOCUMENTS",
  "READ_AUDIT_LOG",
  "MANAGE_ADMINS",
];
