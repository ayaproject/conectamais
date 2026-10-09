// Catálogo inicial definido com o Rodrigo em 2026-10-09 (lançamento em Imbituba, Garopaba e arredores).
// Idempotente: cria só o que não existe e nunca sobrescreve alterações feitas pelo admin.
import type { PrismaClient } from "@prisma/client";
import { normalizeText, slugify } from "../domain/catalog";

export const INITIAL_CATEGORIES = [
  "Pintura",
  "Limpeza",
  "Faxina",
  "Higienização",
  "Jardinagem",
  "Paisagismo",
  "Impermeabilização",
  "Marido de aluguel",
  "Montagem de móveis",
];

// Imbituba e Garopaba (pedidas) e municípios vizinhos sugeridos; o admin pode ativar ou desativar.
export const INITIAL_CITIES = ["Imbituba", "Garopaba", "Paulo Lopes", "Laguna", "Imaruí"];

export async function seedCatalog(db: PrismaClient) {
  let order = 0;
  for (const name of INITIAL_CATEGORIES) {
    order += 10;
    await db.category.upsert({
      where: { slug: slugify(name) },
      create: { name, slug: slugify(name), searchName: normalizeText(name), sortOrder: order },
      update: {},
    });
  }
  for (const name of INITIAL_CITIES) {
    await db.city.upsert({
      where: { slug: `${slugify(name)}-sc` },
      create: { name, state: "SC", slug: `${slugify(name)}-sc` },
      update: {},
    });
  }
}
