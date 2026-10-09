import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { publicCategoriesWithCounts, publicCities, searchServices } from "@/server/services/search";
import { parseSearchQuery } from "@/domain/catalog";
import { SearchForm } from "@/components/search-form";
import { ServiceCard } from "@/components/service-card";

export const metadata: Metadata = {
  title: "Buscar serviços",
  description: "Encontre prestadores de serviço aprovados em Imbituba, Garopaba e região.",
  alternates: { canonical: "/servicos" },
};

export default async function Page({ searchParams }: PageProps<"/servicos">) {
  const query = parseSearchQuery(await searchParams);
  const now = new Date();
  const [categories, cities, result] = await Promise.all([
    publicCategoriesWithCounts(db),
    publicCities(db),
    searchServices(
      db,
      {
        q: query.q,
        category: query.category || undefined,
        city: query.city || undefined,
        maxPriceCents: query.maxPriceCents,
        mode: query.mode,
        verifiedOnly: query.verifiedOnly,
        page: query.page,
      },
      now,
    ),
  ]);
  const anyFilter = Boolean(query.q || query.category || query.city || query.maxPrice || query.mode || query.verifiedOnly);

  function pageHref(page: number) {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.category) p.set("categoria", query.category);
    if (query.city) p.set("cidade", query.city);
    if (query.maxPrice) p.set("preco_max", query.maxPrice);
    if (query.mode) p.set("modalidade", query.mode);
    if (query.verifiedOnly) p.set("verificados", "1");
    if (page > 1) p.set("pagina", String(page));
    const s = p.toString();
    return s ? `/servicos?${s}` : "/servicos";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buscar serviços</h1>
      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <SearchForm query={query} categories={categories} cities={cities} />
      </section>

      <section aria-labelledby="resultados" className="space-y-3">
        <h2 id="resultados" className="text-sm text-slate-600" aria-live="polite">
          {result.total === 0
            ? "Nenhum serviço encontrado"
            : `${result.total} serviço${result.total === 1 ? "" : "s"} encontrado${result.total === 1 ? "" : "s"}`}
        </h2>
        {result.total === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
            {anyFilter ? (
              <p>
                Tente outras palavras ou remova alguns filtros.{" "}
                <Link href="/servicos" className="text-emerald-800 underline">Limpar filtros</Link>
              </p>
            ) : (
              <p>Ainda não há serviços publicados. Estamos aprovando os primeiros prestadores da região.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {result.items.map((s) => <ServiceCard key={s.id} s={s} now={now} />)}
          </ul>
        )}
        {result.pages > 1 && (
          <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
            {result.page > 1 ? <Link href={pageHref(result.page - 1)} className="text-emerald-800 underline">Anterior</Link> : <span />}
            <span className="text-slate-600">Página {result.page} de {result.pages}</span>
            {result.page < result.pages ? <Link href={pageHref(result.page + 1)} className="text-emerald-800 underline">Próxima</Link> : <span />}
          </nav>
        )}
        <p className="text-xs text-slate-500">
          Os resultados mostram primeiro prestadores com documentos verificados e, depois, os serviços publicados mais
          recentemente. Ainda não há avaliações de clientes.
        </p>
      </section>
    </div>
  );
}
