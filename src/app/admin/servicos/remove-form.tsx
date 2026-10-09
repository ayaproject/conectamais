"use client";

import { useActionState } from "react";
import { removeServiceAction } from "@/app/actions/catalog";
import { FormMessage, SubmitButton, TextArea } from "@/components/ui";

export function RemoveServiceForm({ serviceId }: { serviceId: string }) {
  const [state, action] = useActionState(removeServiceAction.bind(null, serviceId), undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <TextArea label="Motivo da remoção" name="reason" rows={2} required hint="O prestador verá este texto." />
      <SubmitButton variant="danger">Remover serviço</SubmitButton>
    </form>
  );
}
