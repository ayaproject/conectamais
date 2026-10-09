"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getStorage } from "@/server/storage";
import { requirePrincipal } from "@/server/auth/session";
import { grantBadge, reviewDocument, revokeBadge, uploadOwnDocument } from "@/server/services/verification";
import { toActionError, type ActionState } from "@/server/action-result";

export async function uploadDocumentAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
    await uploadOwnDocument(db, getStorage(), principal, {
      requirement: String(form.get("requirement") ?? ""),
      type: String(form.get("type") ?? ""),
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    revalidatePath("/prestador");
    return { ok: "Documento enviado." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function reviewDocumentAction(
  providerId: string,
  documentId: string,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    const decision = form.get("decision") === "ACCEPT" ? "ACCEPT" : "REJECT";
    await reviewDocument(db, principal, documentId, decision, String(form.get("note") ?? ""));
    revalidatePath(`/admin/prestadores/${providerId}`);
    return { ok: decision === "ACCEPT" ? "Documento aceito." : "Documento recusado." };
  } catch (e) {
    return toActionError(e);
  }
}

export async function badgeAction(providerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    const note = String(form.get("note") ?? "");
    if (form.get("decision") === "GRANT") await grantBadge(db, principal, providerId, note);
    else await revokeBadge(db, principal, providerId, note);
    revalidatePath(`/admin/prestadores/${providerId}`);
    return { ok: form.get("decision") === "GRANT" ? "Selo concedido." : "Selo removido." };
  } catch (e) {
    return toActionError(e);
  }
}
