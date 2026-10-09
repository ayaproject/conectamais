"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/ui";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Nome" name="name" autoComplete="name" required minLength={2} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        hint="Pelo menos 10 caracteres."
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="asProvider" className="mt-1" />
        <span>
          <span className="font-medium">Quero oferecer meus serviços</span>
          <span className="block text-slate-500">Seu cadastro de prestador passa por análise antes de ficar visível.</span>
        </span>
      </label>
      <SubmitButton>Criar conta</SubmitButton>
      <p className="text-sm text-slate-600">
        Já tem conta? <Link href="/entrar" className="text-emerald-800 underline">Entrar</Link>
      </p>
    </form>
  );
}
