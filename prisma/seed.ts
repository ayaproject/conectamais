// Catálogo inicial definido com o Rodrigo em 2026-10-09 (lançamento em Imbituba, Garopaba e arredores).
// Idempotente: cria só o que não existe e nunca sobrescreve alterações feitas pelo admin.
// Uso: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { normalizeText, slugify } from "../src/domain/catalog";

const CATEGORIES = [
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
const CITIES = ["Imbituba", "Garopaba", "Paulo Lopes", "Laguna", "Imaruí"];

async function main() {
  const db = new PrismaClient();
  try {
    let order = 0;
    for (const name of CATEGORIES) {
      order += 10;
      await db.category.upsert({
        where: { slug: slugify(name) },
        create: { name, slug: slugify(name), searchName: normalizeText(name), sortOrder: order },
        update: {},
      });
    }
    for (const name of CITIES) {
      await db.city.upsert({
        where: { slug: `${slugify(name)}-sc` },
        create: { name, state: "SC", slug: `${slugify(name)}-sc` },
        update: {},
      });
    }
    console.log(`Catálogo inicial conferido: ${CATEGORIES.length} categorias, ${CITIES.length} cidades.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
