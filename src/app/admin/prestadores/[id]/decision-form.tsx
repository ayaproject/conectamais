"use client";

import { useActionState } from "react";
import { decideProviderAction } from "@/app/actions/admin";
import { FormMessage, SubmitButton, TextArea } from "@/components/ui";

type Option = { action: string; label: string; variant: "primary" | "secondary" | "danger" };

export function DecisionForm({ providerId, options }: { providerId: string; options: Option[] }) {
  const [state, action] = useActionState(decideProviderAction.bind(null, providerId), undefined);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <TextArea
        label="Motivo ou orientação ao prestador"
        name="reason"
        hint="Obrigatório para pedir correções, rejeitar ou suspender. O prestador verá este texto."
      />
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <SubmitButton key={o.action} name="action" value={o.action} variant={o.variant}>
            {o.label}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}
