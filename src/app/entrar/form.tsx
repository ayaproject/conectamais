"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";

export function SignInForm() {
  const [state, action] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton>Entrar</SubmitButton>
      <p className="text-sm text-slate-600">
        Ainda não tem conta? <Link href="/cadastro" className="text-emerald-800 underline">Criar conta</Link>
      </p>
    </form>
  );
}
