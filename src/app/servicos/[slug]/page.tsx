import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/server/db";
import { getPublicService } from "@/server/services/search";
import { siteUrl } from "@/server/site";
import { priceLabel } from "@/domain/catalog";
import { VerifiedBadge } from "@/components/document-status";

const load = cache((slug: string) => getPublicService(db, slug));

function excerpt(s: string, max = 155) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps<"/servicos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) return { title: "Serviço não encontrado", robots: { index: false } };
  return {
    title: `${s.title} em ${s.cities.map((c) => c.city.name).slice(0, 3).join(", ")}`,
    description: excerpt(s.description),
    alternates: { canonical: `/servicos/${s.slug}` },
  };
}

export default async function Page({ params }: PageProps<"/servicos/[slug]">) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  const now = new Date();
  const verified = s.provider.verifiedUntil && s.provider.verifiedUntil > now;
  const base = siteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title,
    description: excerpt(s.description, 500),
    url: `${base}/servicos/${s.slug}`,
    serviceType: s.category.name,
    provider: { "@type": "LocalBusiness", name: s.provider.displayName },
    areaServed: s.cities.map((c) => ({ "@type": "City", name: `${c.city.name}, ${c.city.state}` })),
    ...(s.pricingMode === "FIXED" && s.priceCents !== null
      ? { offers: { "@type": "Offer", price: (s.priceCents / 100).toFixed(2), priceCurrency: "BRL" } }
      : {}),
  };

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        // JSON.stringify escapa aspas; "<" é escapado para não fechar a tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Trilha" className="text-sm text-slate-600">
        <Link href="/servicos" className="underline">Serviços</Link>
        {s.category.parent && (
          <> / <Link href={`/categorias/${s.category.parent.slug}`} className="underline">{s.category.parent.name}</Link></>
        )}
        {" / "}
        <Link href={`/categorias/${s.category.slug}`} className="underline">{s.category.name}</Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{s.title}</h1>
        <p className="text-xl font-semibold text-slate-900">{priceLabel(s)}</p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-semibold">Sobre o serviço</h2>
        <p className="whitespace-pre-line text-slate-800">{s.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-600">Cidades atendidas</dt>
            <dd>{s.cities.map((c) => `${c.city.name}/${c.city.state}`).join(", ")}</dd>
          </div>
          {s.estimatedDuration && (
            <div>
              <dt className="font-medium text-slate-600">Duração estimada</dt>
              <dd>{s.estimatedDuration}</dd>
            </div>
          )}
          {s.conditions && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-600">Condições</dt>
              <dd className="whitespace-pre-line">{s.conditions}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-semibold">Prestador</h2>
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {s.provider.displayName}
          {verified && s.provider.verifiedUntil && <VerifiedBadge until={s.provider.verifiedUntil} />}
        </p>
        {s.provider.city && <p className="text-sm text-slate-600">{s.provider.city}/{s.provider.state}</p>}
        {s.provider.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{s.provider.description}</p>}
        <p className="mt-3 text-xs text-slate-500">
          Cadastro aprovado pela equipe do Conecta+.
          {verified ? " Documentos conferidos; isso não garante a qualidade do serviço." : ""}
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-700">
        <h2 className="font-semibold">Contratação pela plataforma em breve</h2>
        <p className="mt-1 text-sm">
          Ainda não é possível solicitar ou pagar este serviço pelo Conecta+. Essa etapa está em desenvolvimento.
        </p>
      </section>
    </article>
  );
}
