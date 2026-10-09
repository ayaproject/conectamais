import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { getOwnProviderProfile } from "@/server/services/providers";
import { listOwnServices } from "@/server/services/provider-services";
import { canOfferServices } from "@/domain/provider-status";
import { checkOwnerServiceAction, formatBRL, PRICE_UNIT_LABELS, SERVICE_STATUS_LABELS } from "@/domain/catalog";
import { ServiceStatusForm } from "./service-form";

export const metadata: Metadata = { title: "Meus serviços", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/prestador/servicos">) {
  const principal = await requireRole("PROVIDER");
  const profile = await getOwnProviderProfile(db, principal);
  const services = await listOwnServices(db, principal);
  const approved = canOfferServices(profile.status);
  const query = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Meus serviços</h1>
        {approved && (
          <Link href="/prestador/servicos/novo" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Novo serviço
          </Link>
        )}
      </div>
      {query.salvo === "1" && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Serviço salvo. Publique quando quiser que ele apareça na busca.
        </p>
      )}
      {!approved && (
        <p role="note" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Só prestadores com cadastro aprovado podem cadastrar e publicar serviços.{" "}
          {services.length > 0 && "Seus serviços estão fora da busca enquanto o cadastro não estiver aprovado. "}
          <Link href="/prestador" className="underline">Ver situação do cadastro</Link>
        </p>
      )}

      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">Você ainda não cadastrou serviços.</p>
      ) : (
        <ul className="space-y-3">
          {services.map((s) => {
            const actions = approved ? (["PUBLISH", "PAUSE"] as const).filter((a) => checkOwnerServiceAction(s.status, a)) : [];
            return (
              <li key={s.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-medium">{s.title}</span>
                    <span className="block text-xs text-slate-500">
                      {s.category.name} ·{" "}
                      {s.pricingMode === "FIXED" && s.priceCents !== null && s.priceUnit
                        ? `${formatBRL(s.priceCents)} ${PRICE_UNIT_LABELS[s.priceUnit]}`
                        : "Sob orçamento"}{" "}
                      · {s.cities.map((c) => c.city.name).join(", ")}
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    {SERVICE_STATUS_LABELS[s.status]}
                  </span>
                </div>
                {s.status === "REMOVED" && s.moderationNote && (
                  <p className="text-sm text-red-800">Motivo da remoção: {s.moderationNote}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {approved && s.status !== "REMOVED" && (
                    <Link href={`/prestador/servicos/${s.id}`} className="text-emerald-800 underline">Editar</Link>
                  )}
                  {s.status === "PUBLISHED" && approved && (
                    <Link href={`/servicos/${s.slug}`} className="text-emerald-800 underline">Ver página pública</Link>
                  )}
                  <ServiceStatusForm serviceId={s.id} actions={[...actions]} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
