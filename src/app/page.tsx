import Link from "next/link";
import { db } from "@/server/db";
import { publicCategoriesWithCounts, publicCities } from "@/server/services/search";
import { SearchForm } from "@/components/search-form";

export default async function Home() {
  const [categories, cities] = await Promise.all([publicCategoriesWithCounts(db), publicCities(db)]);
  const total = categories.reduce((n, c) => n + c.count, 0);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Encontre profissionais de confiança para o serviço que você precisa.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Prestadores de {cities.map((c) => c.name).join(", ") || "sua região"} analisados pela nossa equipe antes de
          aparecerem na plataforma.
        </p>
        <div className="mt-6">
          <SearchForm categories={categories} cities={cities} />
        </div>
      </section>

      <section aria-labelledby="categorias" className="space-y-3">
        <h2 id="categorias" className="text-lg font-semibold">Categorias</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/categorias/${c.slug}`} className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-emerald-600">
                <span className="font-medium">{c.name}</span>
                <span className="block text-xs text-slate-500">
                  {c.count === 0 ? "Em breve" : `${c.count} serviço${c.count === 1 ? "" : "s"}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {total === 0 && (
          <p className="text-sm text-slate-600">
            Ainda não há serviços publicados. Estamos aprovando os primeiros prestadores da região.
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold">Você presta serviços?</h2>
        <p className="mt-1 text-sm text-slate-600">Cadastre-se, envie seus documentos e, depois da aprovação, publique seus serviços.</p>
        <Link href="/cadastro" className="mt-3 inline-block rounded-md bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800">
          Quero oferecer meus serviços
        </Link>
      </section>
    </div>
  );
}
