import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAnyPermission } from "@/server/auth/session";
import { listServicesForModeration } from "@/server/services/provider-services";
import { SERVICE_STATUS_LABELS } from "@/domain/catalog";
import { RemoveServiceForm } from "./remove-form";

export const metadata: Metadata = { title: "Moderação de serviços", robots: { index: false } };

export default async function Page() {
  const principal = await requireAnyPermission("MODERATE_SERVICES");
  const services = await listServicesForModeration(db, principal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderação de serviços</h1>
        <p className="mt-1 text-sm text-slate-600">
          Serviços publicados ou pausados, dos mais recentes para os mais antigos. A remoção é definitiva para o
          prestador e fica registrada na auditoria.
        </p>
      </div>
      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">Nenhum serviço publicado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {services.map((s) => (
            <li key={s.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  {s.status === "PUBLISHED" ? (
                    <Link href={`/servicos/${s.slug}`} className="font-medium text-emerald-800 underline">{s.title}</Link>
                  ) : (
                    <span className="font-medium">{s.title}</span>
                  )}
                  <span className="block text-xs text-slate-500">
                    {s.provider.displayName} · {s.category.name} · {SERVICE_STATUS_LABELS[s.status]}
                  </span>
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-red-800 underline">Remover</summary>
                <div className="mt-2"><RemoveServiceForm serviceId={s.id} /></div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
