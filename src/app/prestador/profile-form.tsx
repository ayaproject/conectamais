"use client";

import { useActionState } from "react";
import {
  deactivateProviderProfileAction,
  saveProviderProfileAction,
  submitProviderProfileAction,
} from "@/app/actions/provider";
import { Field, FormMessage, SubmitButton, TextArea } from "@/components/ui";

type Profile = {
  kind: "INDIVIDUAL" | "COMPANY";
  legalName: string;
  displayName: string;
  description: string;
  experience: string;
  city: string;
  state: string;
  website: string | null;
  googleBusinessUrl: string | null;
};

export function ProfileForm({ profile, editable }: { profile: Profile; editable: boolean }) {
  const [state, action] = useActionState(saveProviderProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <fieldset disabled={!editable} className="space-y-4 disabled:opacity-70">
        <legend className="sr-only">Dados do perfil profissional</legend>
        <div className="text-sm">
          <span className="font-medium text-slate-800">Tipo de cadastro</span>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="kind" value="INDIVIDUAL" defaultChecked={profile.kind === "INDIVIDUAL"} /> Pessoa física
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="kind" value="COMPANY" defaultChecked={profile.kind === "COMPANY"} /> Pessoa jurídica
            </label>
          </div>
        </div>
        <Field
          label="Nome completo ou razão social"
          name="legalName"
          defaultValue={profile.legalName}
          hint="Usado apenas na análise. Não aparece publicamente."
        />
        <Field label="Nome profissional ou nome fantasia" name="displayName" defaultValue={profile.displayName} />
        <TextArea
          label="Descrição dos seus serviços"
          name="description"
          defaultValue={profile.description}
          hint="Mínimo de 30 caracteres."
        />
        <TextArea label="Experiência profissional (opcional)" name="experience" defaultValue={profile.experience} />
        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <Field label="Cidade" name="city" defaultValue={profile.city} />
          <Field label="UF" name="state" defaultValue={profile.state} maxLength={2} />
        </div>
        <Field label="Site (opcional)" name="website" type="url" defaultValue={profile.website ?? ""} />
        <Field
          label="Link do Perfil da Empresa no Google (opcional)"
          name="googleBusinessUrl"
          type="url"
          defaultValue={profile.googleBusinessUrl ?? ""}
        />
        {editable && <SubmitButton variant="secondary">Salvar rascunho</SubmitButton>}
      </fieldset>
    </form>
  );
}

export function SubmitForReviewForm() {
  const [state, action] = useActionState(submitProviderProfileAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <SubmitButton>Enviar para análise</SubmitButton>
    </form>
  );
}

export function DeactivateForm() {
  const [state, action] = useActionState(deactivateProviderProfileAction, undefined);
  return (
    <form
      action={action}
      className="space-y-2"
      onSubmit={(e) => {
        if (!confirm("Desativar seu cadastro de prestador? Esta ação não pode ser desfeita por você.")) e.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <SubmitButton variant="danger">Desativar cadastro de prestador</SubmitButton>
    </form>
  );
}
