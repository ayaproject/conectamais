"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/server/action-result";

export function SubmitButton({
  children,
  variant = "primary",
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-emerald-700 text-white hover:bg-emerald-800",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    danger: "bg-red-700 text-white hover:bg-red-800",
  }[variant];
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60 ${styles}`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-md px-3 py-2 text-sm ${state.error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
    >
      {state.error ?? state.ok}
    </p>
  );
}

export function Field({
  label,
  name,
  hint,
  ...props
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      <input
        name={name}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  name,
  hint,
  ...props
}: { label: string; name: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={4}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
