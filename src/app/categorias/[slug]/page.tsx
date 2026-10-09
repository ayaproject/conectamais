import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/server/db";
import { getPublicCategory, searchServices } from "@/server/services/search";
import { parseSearchQuery } from "@/domain/catalog";
import { ServiceCard } from "@/components/service-card";

const load = cache(async (slug: string, page: number) => {
  const category = await getPublicCategory(db, slug);
  if (!category) return null;
  const result = await searchServices(db, { category: slug, page });
  return { category, result };
});

export async function generateMetadata({ params, searchParams }: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { page } = parseSearchQuery(await searchParams);
  const data = await load(slug, page);
  if (!data) return { title: "Categoria não encontrada", robots: { index: false } };
  return {
    title: `${data.category.name} em Imbituba, Garopaba e região`,
    description: data.category.description || `Prestadores de ${data.category.name.toLowerCase()} aprovados pela equipe do Conecta+.`,
    alternates: { canonical: `/categorias/${data.category.slug}` },
    // Categoria sem serviços não deve ser indexada (página vazia).
    robots: data.result.total === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function Page({ params, searchParams }: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const { page } = parseSearchQuery(await searchParams);
  const data = await load(slug, page);
  if (!data) notFound();
  const { category, result } = data;
  const now = new Date();

  return (
    <div className="space-y-6">
      <nav aria-label="Trilha" className="text-sm text-slate-600">
        <Link href="/servicos" className="underline">Serviços</Link>
        {category.parent && <> / <Link href={`/categorias/${category.parent.slug}`} className="underline">{category.parent.name}</Link></>}
      </nav>
      <h1 className="text-2xl font-bold">{category.name}</h1>
      {category.description && <p className="text-slate-600">{category.description}</p>}
      {category.children.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {category.children.map((c) => (
            <li key={c.slug}><Link href={`/categorias/${c.slug}`} className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-300">{c.name}</Link></li>
          ))}
        </ul>
      )}
      {result.total === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
          Ainda não há serviços publicados nesta categoria.
        </p>
      ) : (
        <ul className="space-y-3">{result.items.map((s) => <ServiceCard key={s.id} s={s} now={now} />)}</ul>
      )}
      {result.pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
          {result.page > 1 ? <Link href={`/categorias/${category.slug}?pagina=${result.page - 1}`} className="text-emerald-800 underline">Anterior</Link> : <span />}
          <span className="text-slate-600">Página {result.page} de {result.pages}</span>
          {result.page < result.pages ? <Link href={`/categorias/${category.slug}?pagina=${result.page + 1}`} className="text-emerald-800 underline">Próxima</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
