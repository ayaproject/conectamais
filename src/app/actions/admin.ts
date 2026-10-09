"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requirePrincipal } from "@/server/auth/session";
import { adminDecideProvider } from "@/server/services/providers";
import { toActionError, type ActionState } from "@/server/action-result";
import type { ProviderAction } from "@/domain/provider-status";

const ADMIN_ACTIONS: ProviderAction[] = ["APPROVE", "REQUEST_CHANGES", "REJECT", "SUSPEND", "REINSTATE", "DEACTIVATE"];

export async function decideProviderAction(providerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    const action = String(form.get("action")) as ProviderAction;
    if (!ADMIN_ACTIONS.includes(action)) return { error: "Ação inválida." };
    await adminDecideProvider(db, principal, providerId, action, String(form.get("reason") ?? ""));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePath("/admin/prestadores");
  revalidatePath(`/admin/prestadores/${providerId}`);
  // Volta para a fila, que é onde o admin continua o trabalho.
  redirect("/admin/prestadores?decidido=1");
}
