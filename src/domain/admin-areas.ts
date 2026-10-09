import { hasPermission, type AdminPermission, type Principal } from "./permissions";

// Áreas do painel e quem pode entrar em cada uma.
export const ADMIN_AREAS: { href: string; label: string; anyOf: AdminPermission[] }[] = [
  { href: "/admin/prestadores", label: "Prestadores", anyOf: ["APPROVE_PROVIDERS", "SUSPEND_PROVIDERS", "VERIFY_DOCUMENTS"] },
  { href: "/admin/servicos", label: "Serviços", anyOf: ["MODERATE_SERVICES"] },
  { href: "/admin/catalogo", label: "Categorias e cidades", anyOf: ["MANAGE_CATALOG"] },
];

export function adminAreasFor(p: Principal) {
  return ADMIN_AREAS.filter((a) => a.anyOf.some((perm) => hasPermission(p, perm)));
}
