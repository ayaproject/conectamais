"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requirePrincipal } from "@/server/auth/session";
import {
  deactivateOwnProviderProfile,
  submitOwnProviderProfile,
  updateOwnProviderProfile,
} from "@/server/services/providers";
import { toActionError, type ActionState } from "@/server/action-result";

const FIELDS = ["kind", "legalName", "displayName", "description", "experience", "city", "state", "website", "googleBusinessUrl"];

export async function saveProviderProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    const input = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? "")]));
    await updateOwnProviderProfile(db, principal, input);
    revalidatePath("/prestador");
    return { ok: "Perfil salvo." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitProviderProfileAction(): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await submitOwnProviderProfile(db, principal);
    revalidatePath("/prestador");
    return { ok: "Cadastro enviado para análise." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function deactivateProviderProfileAction(): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await deactivateOwnProviderProfile(db, principal);
    revalidatePath("/prestador");
    return { ok: "Cadastro desativado." };
  } catch (e) {
    return toActionError(e);
  }
}
