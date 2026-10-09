"use client";

import { useActionState } from "react";
import { badgeAction, reviewDocumentAction } from "@/app/actions/verification";
import { Field, FormMessage, SubmitButton } from "@/components/ui";

export function DocumentReviewForm({ providerId, documentId }: { providerId: string; documentId: string }) {
  const [state, action] = useActionState(reviewDocumentAction.bind(null, providerId, documentId), undefined);
  return (
    <form action={action} className="mt-3 space-y-2">
      <FormMessage state={state} />
      <Field label="Observação (obrigatória para recusar)" name="note" />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="decision" value="ACCEPT">Aceitar documento</SubmitButton>
        <SubmitButton name="decision" value="REJECT" variant="danger">Recusar documento</SubmitButton>
      </div>
    </form>
  );
}

export function BadgeForm({ providerId, mode }: { providerId: string; mode: "GRANT" | "REVOKE" }) {
  const [state, action] = useActionState(badgeAction.bind(null, providerId), undefined);
  return (
    <form action={action} className="space-y-2">
      <FormMessage state={state} />
      <Field label={mode === "GRANT" ? "Observação (opcional)" : "Motivo da remoção"} name="note" />
      <SubmitButton name="decision" value={mode} variant={mode === "GRANT" ? "primary" : "danger"}>
        {mode === "GRANT" ? "Conceder selo de verificado" : "Remover selo"}
      </SubmitButton>
    </form>
  );
}
