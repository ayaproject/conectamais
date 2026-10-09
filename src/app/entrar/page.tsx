import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPrincipal } from "@/server/auth/session";
import { SignInForm } from "./form";

export const metadata: Metadata = { title: "Entrar" };

export default async function Page() {
  if (await getPrincipal()) redirect("/conta");
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="mb-4 text-2xl font-bold">Entrar</h1>
      <SignInForm />
    </div>
  );
}
