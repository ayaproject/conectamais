import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireAnyPermission } from "@/server/auth/session";
import { listCategoriesForAdmin, listCitiesForAdmin } from "@/server/services/catalog-admin";
import { EditCategoryForm, NewCategoryForm, NewCityForm, ToggleCategory, ToggleCity } from "./forms";

export const metadata: Metadata = { title: "Categorias e cidades", robots: { index: false } };

export default async function Page() {
  const principal = await requireAnyPermission("MANAGE_CATALOG");
  const [categories, cities] = await Promise.all([listCategoriesForAdmin(db, principal), listCitiesForAdmin(db, principal)]);
  const parents = categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Categorias e cidades</h1>
        <p className="mt-1 text-sm text-slate-600">
          Categoria ou cidade desativada some da busca e dos formulários. Os serviços ligados a uma categoria desativada
          deixam de aparecer até ela ser reativada.
        </p>
      </div>

      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Categorias</h2>
        <ul className="divide-y divide-slate-100">
          {categories.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className={`font-medium ${c.active ? "" : "text-slate-400 line-through"}`}>{c.name}</span>
                  {c.parentId && <span className="ml-2 text-xs text-slate-500">em {nameById.get(c.parentId)}</span>}
                  <span className="block text-xs text-slate-500">
                    /{c.slug} · {c._count.services} serviço(s){c.active ? "" : " · desativada"}
                  </span>
                </div>
                <ToggleCategory id={c.id} active={c.active} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-emerald-800 underline">Editar</summary>
                <div className="mt-3"><EditCategoryForm category={c} parents={parents} /></div>
              </details>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer font-medium text-emerald-800">Nova categoria</summary>
          <div className="mt-3"><NewCategoryForm parents={parents} /></div>
        </details>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Cidades atendidas</h2>
        <ul className="divide-y divide-slate-100">
          {cities.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <span className={`font-medium ${c.active ? "" : "text-slate-400 line-through"}`}>{c.name}/{c.state}</span>
                <span className="block text-xs text-slate-500">
                  {c._count.services} serviço(s){c.active ? "" : " · desativada"}
                </span>
              </div>
              <ToggleCity id={c.id} active={c.active} />
            </li>
          ))}
        </ul>
        <NewCityForm />
      </section>
    </div>
  );
}
