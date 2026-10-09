import type { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { searchTokens } from "@/domain/catalog";

// Consultas públicas. Toda listagem pública parte de publicServiceWhere,
// que espelha isServicePubliclyVisible (src/domain/catalog.ts).
export function publicServiceWhere(): Prisma.ServiceWhereInput {
  return {
    status: "PUBLISHED",
    provider: { status: "APPROVED" },
    category: { active: true, OR: [{ parentId: null }, { parent: { active: true } }] },
  };
}

export type SearchFilters = {
  q?: string;
  category?: string; // slug
  city?: string; // slug
  maxPriceCents?: number;
  mode?: "FIXED" | "QUOTE";
  verifiedOnly?: boolean;
  page?: number;
};

export const PAGE_SIZE = 20;

export async function searchServices(db: Db, f: SearchFilters, now = new Date()) {
  const and: Prisma.ServiceWhereInput[] = [publicServiceWhere()];

  for (const t of searchTokens(f.q ?? "")) {
    and.push({
      OR: [
        { searchText: { contains: t } },
        { category: { searchName: { contains: t } } },
        { category: { parent: { searchName: { contains: t } } } },
        { provider: { displayName: { contains: t, mode: "insensitive" } } },
      ],
    });
  }
  if (f.category) {
    and.push({ OR: [{ category: { slug: f.category } }, { category: { parent: { slug: f.category } } }] });
  }
  if (f.city) and.push({ cities: { some: { city: { slug: f.city, active: true } } } });
  if (f.mode) and.push({ pricingMode: f.mode });
  if (f.maxPriceCents !== undefined) and.push({ pricingMode: "FIXED", priceCents: { lte: f.maxPriceCents } });
  if (f.verifiedOnly) and.push({ provider: { verifiedUntil: { gt: now } } });

  const where: Prisma.ServiceWhereInput = { AND: and };
  const page = Math.max(1, Math.min(f.page ?? 1, 500));
  const [total, items] = await Promise.all([
    db.service.count({ where }),
    db.service.findMany({
      where,
      // Ordenação documentada em docs/busca.md: selo verificado vigente primeiro, depois os mais recentes.
      orderBy: [{ provider: { verifiedUntil: { sort: "desc", nulls: "last" } } }, { publishedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: publicServiceSelect,
    }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), items };
}

export const publicServiceSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  pricingMode: true,
  priceCents: true,
  priceUnit: true,
  estimatedDuration: true,
  conditions: true,
  publishedAt: true,
  updatedAt: true,
  category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
  cities: { select: { city: { select: { name: true, state: true, slug: true } } } },
  // Somente dados públicos do prestador. Nome civil, documentos e contato nunca saem daqui.
  provider: { select: { id: true, displayName: true, city: true, state: true, description: true, verifiedUntil: true, status: true } },
} satisfies Prisma.ServiceSelect;

export async function getPublicService(db: Db, slug: string) {
  return db.service.findFirst({ where: { AND: [publicServiceWhere(), { slug }] }, select: publicServiceSelect });
}

export async function getPublicCategory(db: Db, slug: string) {
  return db.category.findFirst({
    where: { slug, active: true, OR: [{ parentId: null }, { parent: { active: true } }] },
    select: {
      name: true,
      slug: true,
      description: true,
      parent: { select: { name: true, slug: true } },
      children: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } },
    },
  });
}

export async function publicCategoriesWithCounts(db: Db) {
  const cats = await db.category.findMany({
    where: { active: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
  const counts = await Promise.all(
    cats.map((c) =>
      db.service.count({ where: { AND: [publicServiceWhere(), { OR: [{ categoryId: c.id }, { category: { parentId: c.id } }] }] } }),
    ),
  );
  return cats.map((c, i) => ({ ...c, count: counts[i] }));
}

export async function publicCities(db: Db) {
  return db.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { name: true, state: true, slug: true } });
}
