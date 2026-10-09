import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { getOwnProviderProfile } from "@/server/services/providers";
import { serviceFormOptions } from "@/server/services/provider-services";
import { canOfferServices } from "@/domain/provider-status";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Novo serviço", robots: { index: false } };

export default async function Page() {
  const principal = await requireRole("PROVIDER");
  const profile = await getOwnProviderProfile(db, principal);
  if (!canOfferServices(profile.status)) redirect("/prestador/servicos");
  const options = await serviceFormOptions(db);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Novo serviço</h1>
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ServiceForm serviceId={null} options={options} />
      </section>
    </div>
  );
}
