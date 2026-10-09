import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requirePrincipal } from "@/server/auth/session";
import { hasRole } from "@/domain/permissions";

export const metadata: Metadata = { title: "Minha conta" };

const ROLE_LABELS = { CLIENT: "Cliente", PROVIDER: "Prestador", ADMIN: "Administrador" } as const;

export default async function Page() {
  const principal = await requirePrincipal();
  const user = await db.user.findUniqueOrThrow({
    where: { id: principal.userId },
    select: { name: true, email: true },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Olá, {user.name}</h1>
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">E-mail</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Perfis</dt>
            <dd className="font-medium">{principal.roles.map((r) => ROLE_LABELS[r]).join(", ")}</dd>
          </div>
        </dl>
      </section>
      {hasRole(principal, "PROVIDER") && (
        <Link href="/prestador" className="inline-block text-emerald-800 underline">
          Ir para a área do prestador
        </Link>
      )}
    </div>
  );
}
