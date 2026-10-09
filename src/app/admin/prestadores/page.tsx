import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAnyPermission } from "@/server/auth/session";
import { listProvidersForAdmin } from "@/server/services/providers";
import { PROVIDER_STATUSES, PROVIDER_STATUS_LABELS, type ProviderStatus } from "@/domain/provider-status";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Cadastros de prestadores", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/admin/prestadores">) {
  const principal = await requireAnyPermission("APPROVE_PROVIDERS", "SUSPEND_PROVIDERS");
  const query = await searchParams;
  const raw = query.status;
  const status: ProviderStatus = PROVIDER_STATUSES.includes(raw as ProviderStatus) ? (raw as ProviderStatus) : "IN_REVIEW";
  const providers = await listProvidersForAdmin(db, principal, status);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cadastros de prestadores</h1>
      {query.decidido === "1" && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Decisão registrada.
        </p>
      )}
      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2 text-sm">
        {PROVIDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/prestadores?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className={`rounded-full px-3 py-1 ring-1 ${s === status ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white ring-slate-300"}`}
          >
            {PROVIDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>
      {providers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
          Nenhum cadastro com status “{PROVIDER_STATUS_LABELS[status]}”.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Prestador</th>
                <th className="px-4 py-2 font-medium">Cidade</th>
                <th className="px-4 py-2 font-medium">Enviado em</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link href={`/admin/prestadores/${p.id}`} className="font-medium text-emerald-800 underline">
                      {p.displayName || "(sem nome)"}
                    </Link>
                    <span className="block text-xs text-slate-500">{p.user.email}</span>
                  </td>
                  <td className="px-4 py-2">{p.city ? `${p.city}/${p.state}` : "—"}</td>
                  <td className="px-4 py-2">
                    {p.submittedAt?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) ?? "—"}
                  </td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
