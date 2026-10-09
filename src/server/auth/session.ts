import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { createSessionRecord, deleteSessionRecord, findSessionUser } from "../services/accounts";
import { loadPrincipal } from "../services/principal";
import { hasPermission, hasRole, type AdminPermission, type Principal, type Role } from "@/domain/permissions";

const COOKIE = "conecta_session";

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSessionRecord(db, userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await deleteSessionRecord(db, token);
  store.delete(COOKIE);
}

// Lê a sessão no banco a cada requisição (memorizado durante a renderização).
export const getPrincipal = cache(async (): Promise<Principal | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const userId = await findSessionUser(db, token);
  return userId ? loadPrincipal(db, userId) : null;
});

export async function requirePrincipal(): Promise<Principal> {
  const p = await getPrincipal();
  if (!p) redirect("/entrar");
  return p;
}

export async function requireRole(role: Role): Promise<Principal> {
  const p = await requirePrincipal();
  if (!hasRole(p, role)) redirect("/conta");
  return p;
}

export async function requireAnyPermission(...perms: AdminPermission[]): Promise<Principal> {
  const p = await requirePrincipal();
  if (!perms.some((perm) => hasPermission(p, perm))) redirect("/conta");
  return p;
}
