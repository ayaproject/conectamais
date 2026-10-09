import type { SearchQuery } from "@/domain/catalog";

type Option = { slug: string; name: string };

const selectClass = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2";

// Formulário GET: funciona sem JavaScript e gera URLs compartilháveis.
export function SearchForm({ query, categories, cities }: { query?: SearchQuery; categories: Option[]; cities: (Option & { state: string })[] }) {
  return (
    <form action="/servicos" method="get" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-sm sm:col-span-2 lg:col-span-4">
        <span className="font-medium text-slate-800">O que você precisa?</span>
        <input
          type="search"
          name="q"
          defaultValue={query?.q}
          placeholder="Ex.: pintura, faxina, montagem de móveis"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-800">Categoria</span>
        <select name="categoria" defaultValue={query?.category ?? ""} className={selectClass}>
          <option value="">Todas</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-800">Cidade</span>
        <select name="cidade" defaultValue={query?.city ?? ""} className={selectClass}>
          <option value="">Todas</option>
          {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}/{c.state}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-800">Preço máximo (R$)</span>
        <input name="preco_max" inputMode="decimal" defaultValue={query?.maxPrice} placeholder="Ex.: 300"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-800">Modalidade</span>
        <select name="modalidade" defaultValue={query?.mode ?? ""} className={selectClass}>
          <option value="">Todas</option>
          <option value="FIXED">Preço fixo</option>
          <option value="QUOTE">Sob orçamento</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="verificados" value="1" defaultChecked={query?.verifiedOnly} />
        Só prestadores com documentos verificados
      </label>
      <div className="lg:text-right">
        <button type="submit" className="w-full rounded-md bg-emerald-700 px-5 py-2 font-medium text-white hover:bg-emerald-800 lg:w-auto">
          Buscar
        </button>
      </div>
    </form>
  );
}
