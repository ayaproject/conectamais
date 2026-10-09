"use client";

import { useActionState } from "react";
import {
  createCategoryAction,
  createCityAction,
  setCategoryActiveAction,
  setCityActiveAction,
  updateCategoryAction,
} from "@/app/actions/catalog";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/ui";

type Parent = { id: string; name: string };
type Category = { id: string; name: string; description: string; parentId: string | null; sortOrder: number };

function ParentSelect({ parents, defaultValue }: { parents: Parent[]; defaultValue?: string | null }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">Categoria principal</span>
      <select
        name="parentId"
        defaultValue={defaultValue ?? ""}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
      >
        <option value="">Nenhuma (categoria principal)</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </label>
  );
}

export function NewCategoryForm({ parents }: { parents: Parent[] }) {
  const [state, action] = useActionState(createCategoryAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Nome" name="name" required maxLength={60} />
      <ParentSelect parents={parents} />
      <Field label="Ordem de exibição" name="sortOrder" type="number" min={0} defaultValue={100} />
      <div className="sm:col-span-2"><TextArea label="Descrição (opcional)" name="description" maxLength={500} rows={2} /></div>
      <div><SubmitButton>Criar categoria</SubmitButton></div>
    </form>
  );
}

export function EditCategoryForm({ category, parents }: { category: Category; parents: Parent[] }) {
  const [state, action] = useActionState(updateCategoryAction.bind(null, category.id), undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Nome" name="name" required maxLength={60} defaultValue={category.name} />
      <ParentSelect parents={parents.filter((p) => p.id !== category.id)} defaultValue={category.parentId} />
      <Field label="Ordem de exibição" name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} />
      <div className="sm:col-span-2">
        <TextArea label="Descrição (opcional)" name="description" maxLength={500} rows={2} defaultValue={category.description} />
      </div>
      <div><SubmitButton variant="secondary">Salvar</SubmitButton></div>
    </form>
  );
}

export function ToggleCategory({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(setCategoryActiveAction.bind(null, id, !active), undefined);
  return (
    <form action={action}>
      {state?.error && <FormMessage state={state} />}
      <SubmitButton variant={active ? "secondary" : "primary"}>{active ? "Desativar" : "Ativar"}</SubmitButton>
    </form>
  );
}

export function NewCityForm() {
  const [state, action] = useActionState(createCityAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_6rem_auto] sm:items-end">
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      <Field label="Cidade" name="name" required maxLength={80} />
      <Field label="UF" name="state" required maxLength={2} defaultValue="SC" />
      <div><SubmitButton>Cadastrar cidade</SubmitButton></div>
    </form>
  );
}

export function ToggleCity({ id, active }: { id: string; active: boolean }) {
  const [state, action] = useActionState(setCityActiveAction.bind(null, id, !active), undefined);
  return (
    <form action={action}>
      {state?.error && <FormMessage state={state} />}
      <SubmitButton variant={active ? "secondary" : "primary"}>{active ? "Desativar" : "Ativar"}</SubmitButton>
    </form>
  );
}
