"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requirePrincipal } from "@/server/auth/session";
import { toActionError, type ActionState } from "@/server/action-result";
import {
  createCategory,
  createCity,
  setCategoryActive,
  setCityActive,
  updateCategory,
} from "@/server/services/catalog-admin";
import {
  changeOwnServiceStatus,
  createOwnService,
  removeServiceByModeration,
  updateOwnService,
} from "@/server/services/provider-services";

// Páginas públicas que dependem do catálogo.
function revalidatePublic() {
  revalidatePath("/", "layout");
}

function categoryInput(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    parentId: String(form.get("parentId") ?? ""),
    sortOrder: String(form.get("sortOrder") ?? "0"),
  };
}

// ------------------------------------------------------------- admin: catálogo

export async function createCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await createCategory(db, principal, categoryInput(form));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: "Categoria criada." };
}

export async function updateCategoryAction(id: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await updateCategory(db, principal, id, categoryInput(form));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: "Categoria salva." };
}

export async function setCategoryActiveAction(id: string, active: boolean): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await setCategoryActive(db, principal, id, active);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: active ? "Categoria ativada." : "Categoria desativada." };
}

export async function createCityAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await createCity(db, principal, { name: String(form.get("name") ?? ""), state: String(form.get("state") ?? "") });
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: "Cidade cadastrada." };
}

export async function setCityActiveAction(id: string, active: boolean): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await setCityActive(db, principal, id, active);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: active ? "Cidade ativada." : "Cidade desativada." };
}

// ------------------------------------------------------------- admin: moderação

export async function removeServiceAction(serviceId: string, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    await removeServiceByModeration(db, principal, serviceId, String(form.get("reason") ?? ""));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: "Serviço removido." };
}

// ------------------------------------------------------------- prestador

function serviceInput(form: FormData) {
  return {
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    pricingMode: String(form.get("pricingMode") ?? ""),
    price: String(form.get("price") ?? ""),
    priceUnit: String(form.get("priceUnit") ?? ""),
    estimatedDuration: String(form.get("estimatedDuration") ?? ""),
    conditions: String(form.get("conditions") ?? ""),
    cityIds: form.getAll("cityIds").map(String),
  };
}

export async function saveServiceAction(serviceId: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    const principal = await requirePrincipal();
    if (serviceId) await updateOwnService(db, principal, serviceId, serviceInput(form));
    else await createOwnService(db, principal, serviceInput(form));
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  redirect("/prestador/servicos?salvo=1");
}

export async function changeServiceStatusAction(serviceId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const action = String(form.get("action"));
  if (action !== "PUBLISH" && action !== "PAUSE") return { error: "Ação inválida." };
  try {
    const principal = await requirePrincipal();
    await changeOwnServiceStatus(db, principal, serviceId, action);
  } catch (e) {
    return toActionError(e);
  }
  revalidatePublic();
  return { ok: action === "PUBLISH" ? "Serviço publicado." : "Serviço pausado." };
}
