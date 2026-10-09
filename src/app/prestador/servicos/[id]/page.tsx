import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { DomainError } from "@/server/errors";
import { getOwnProviderProfile } from "@/server/services/providers";
import { getOwnService, serviceFormOptions } from "@/server/services/provider-services";
import { canOfferServices } from "@/domain/provider-status";
import { canOwnerEditService } from "@/domain/catalog";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Editar serviço", robots: { index: false } };

export default async function Page({ params }: PageProps<"/prestador/servicos/[id]">) {
  const principal = await requireRole("PROVIDER");
  const { id } = await params;
  const profile = await getOwnProviderProfile(db, principal);
  if (!canOfferServices(profile.status)) redirect("/prestador/servicos");
  const service = await getOwnService(db, principal, id).catch((e) => {
    if (e instanceof DomainError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  if (!canOwnerEditService(service.status)) redirect("/prestador/servicos");
  const options = await serviceFormOptions(db);
  const price = service.priceCents === null ? "" : (service.priceCents / 100).toFixed(2).replace(".", ",");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Editar serviço</h1>
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ServiceForm
          serviceId={service.id}
          options={options}
          defaults={{
            title: service.title,
            description: service.description,
            categoryId: service.categoryId,
            pricingMode: service.pricingMode,
            price,
            priceUnit: service.priceUnit ?? "",
            estimatedDuration: service.estimatedDuration,
            conditions: service.conditions,
            cityIds: service.cities.map((c) => c.cityId),
          }}
        />
      </section>
    </div>
  );
}
