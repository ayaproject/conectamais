// Uso: npm run db:seed. Dados em src/server/catalog-seed.ts.
import { PrismaClient } from "@prisma/client";
import { INITIAL_CATEGORIES, INITIAL_CITIES, seedCatalog } from "../src/server/catalog-seed";

async function main() {
  const db = new PrismaClient();
  try {
    await seedCatalog(db);
    console.log(`Catálogo inicial conferido: ${INITIAL_CATEGORIES.length} categorias, ${INITIAL_CITIES.length} cidades.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
