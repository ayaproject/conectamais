"use client";

import { useActionState, useRef } from "react";
import { uploadDocumentAction } from "@/app/actions/verification";
import { FormMessage, SubmitButton } from "@/components/ui";
import { DocumentStatus } from "@/components/document-status";
import { DOCUMENT_TYPE_LABELS, type DocumentType, type RequirementKey } from "@/domain/verification";

export type DocumentItem = {
  key: RequirementKey;
  label: string;
  acceptedTypes: readonly DocumentType[];
  document: {
    id: string;
    type: DocumentType;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
    originalName: string;
    reviewNote: string | null;
  } | null;
};

function UploadForm({ item }: { item: DocumentItem }) {
  const [state, action] = useActionState(uploadDocumentAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  const id = `file-${item.key}`;
  return (
    <form ref={form} action={action} className="mt-3 space-y-2">
      <FormMessage state={state} />
      <input type="hidden" name="requirement" value={item.key} />
      {item.acceptedTypes.length > 1 ? (
        <fieldset className="flex gap-4 text-sm">
          <legend className="sr-only">Tipo de documento</legend>
          {item.acceptedTypes.map((t, i) => (
            <label key={t} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="type"
                value={t}
                defaultChecked={item.document ? item.document.type === t : i === 0}
              />{" "}
              {DOCUMENT_TYPE_LABELS[t]}
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="type" value={item.acceptedTypes[0]} />
      )}
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        Arquivo ({item.label})
      </label>
      <input
        id={id}
        type="file"
        name="file"
        required
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
      />
      <p className="text-xs text-slate-500">PDF, JPG ou PNG, até 8 MB. Envie frente e verso no mesmo arquivo.</p>
      <SubmitButton variant="secondary">{item.document ? "Substituir documento" : "Enviar documento"}</SubmitButton>
    </form>
  );
}

export function DocumentsSection({ items, editable }: { items: DocumentItem[]; editable: boolean }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.key} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{item.label}</span>
            <DocumentStatus state={item.document?.status ?? "MISSING"} />
          </div>
          {item.document && (
            <p className="mt-1 text-sm text-slate-600">
              {DOCUMENT_TYPE_LABELS[item.document.type]} ·{" "}
              <a href={`/documentos/${item.document.id}`} target="_blank" rel="noopener" className="text-emerald-800 underline">
                {item.document.originalName}
              </a>
            </p>
          )}
          {item.document?.status === "REJECTED" && item.document.reviewNote && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
              Motivo da recusa: {item.document.reviewNote}
            </p>
          )}
          {editable && item.document?.status !== "ACCEPTED" && <UploadForm item={item} />}
        </li>
      ))}
    </ul>
  );
}
