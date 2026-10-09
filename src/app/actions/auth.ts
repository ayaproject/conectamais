"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { authenticate, signUp } from "@/server/services/accounts";
import { endSession, startSession } from "@/server/auth/session";
import { toActionError, type ActionState } from "@/server/action-result";
import { DomainError } from "@/server/errors";
import { ZodError } from "zod";

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  let userId: string;
  try {
    const user = await signUp(db, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      asProvider: form.get("asProvider") === "on",
    });
    userId = user.id;
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues.map((i) => i.message).join(" ") };
    return toActionError(e);
  }
  await startSession(userId);
  redirect(form.get("asProvider") === "on" ? "/prestador" : "/conta");
}

export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  let userId: string;
  try {
    const user = await authenticate(db, String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    if (!user) throw new DomainError("UNAUTHENTICATED", "E-mail ou senha incorretos.");
    userId = user.id;
  } catch (e) {
    return toActionError(e);
  }
  await startSession(userId);
  redirect("/conta");
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}
