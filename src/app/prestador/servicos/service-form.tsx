"use client";

import { useActionState, useState } from "react";
import { changeServiceStatusAction, saveServiceAction } from "@/app/actions/catalog";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/ui";
import { PRICE_UNIT_LABELS, PRICE_UNITS } from "@/domain/catalog";

type Options = {
  categories: { id: string; name: string; parentId: string | null }[];
  cities: { id: string; name: string; state: string }[];
};

export type ServiceDefaults = {
  title: string;
  description: string;
  categoryId: string;
  pricingMode: "FIXED" | "QUOTE";
  price: string;
  priceUnit: string;
  estimatedDuration: string;
  conditions: string;
  cityIds: string[];
};

const selectClass = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2";

export function ServiceForm({ serviceId, options, defaults }: { serviceId: string | null; options: Options; defaults?: ServiceDefaults }) {
  const [state, action] = useActionState(saveServiceAction.bind(null, serviceId), undefined);
  const [mode, setMode] = useState<"FIXED" | "QUOTE">(defaults?.pricingMode ?? "FIXED");
  const parents = options.categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => options.categories.filter((c) => c.parentId === id);

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Título" name="title" required minLength={5} maxLength={100} defaultValue={defaults?.title}
        hint="Ex.: Pintura de apartamento, Faxina residencial completa" />
      <label className="block text-sm">
        <span className="font-medium text-slate-800">Categoria</span>
        <select name="categoryId" required defaultValue={defaults?.categoryId ?? ""} className={selectClass}>
          <option value="" disabled>Escolha…</option>
          {parents.map((p) =>
            childrenOf(p.id).length === 0 ? (
              <option key={p.id} value={p.id}>{p.name}</option>
            ) : (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name} (geral)</option>
                {childrenOf(p.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </label>
      <TextArea label="Descrição" name="description" required minLength={30} maxLength={3000} rows={6}
        defaultValue={defaults?.description} hint="O que está incluído, materiais, experiência. Não coloque telefone ou e-mail." />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">Preço</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="pricingMode" value="FIXED" checked={mode === "FIXED"} onChange={() => setMode("FIXED")} />
            Preço fixo
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pricingMode" value="QUOTE" checked={mode === "QUOTE"} onChange={() => setMode("QUOTE")} />
            Sob orçamento
          </label>
        </div>
        {mode === "FIXED" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Valor (R$)" name="price" inputMode="decimal" required placeholder="150,00" defaultValue={defaults?.price} />
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Unidade</span>
              <select name="priceUnit" required defaultValue={defaults?.priceUnit || "PER_SERVICE"} className={selectClass}>
                {PRICE_UNITS.map((u) => (
                  <option key={u} value={u}>{PRICE_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </fieldset>

      <Field label="Duração estimada (opcional)" name="estimatedDuration" maxLength={100}
        defaultValue={defaults?.estimatedDuration} placeholder="Ex.: 1 dia, 3 a 4 horas" />
      <TextArea label="Condições (opcional)" name="conditions" maxLength={1000} rows={3}
        defaultValue={defaults?.conditions} hint="Ex.: material por conta do cliente, visita técnica necessária." />

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Cidades atendidas</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {options.cities.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="cityIds" value={c.id} defaultChecked={defaults?.cityIds.includes(c.id)} />
              {c.name}/{c.state}
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton>{serviceId ? "Salvar alterações" : "Salvar como rascunho"}</SubmitButton>
    </form>
  );
}

export function ServiceStatusForm({ serviceId, actions }: { serviceId: string; actions: ("PUBLISH" | "PAUSE")[] }) {
  const [state, action] = useActionState(changeServiceStatusAction.bind(null, serviceId), undefined);
  if (actions.length === 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      {actions.includes("PUBLISH") && <SubmitButton name="action" value="PUBLISH">Publicar</SubmitButton>}
      {actions.includes("PAUSE") && <SubmitButton name="action" value="PAUSE" variant="secondary">Pausar</SubmitButton>}
      <FormMessage state={state} />
    </form>
  );
}
