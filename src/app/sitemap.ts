import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { siteUrl } from "@/server/site";
import { publicServiceWhere } from "@/server/services/search";

// Gerado a cada requisição: só entram categorias com serviços e serviços publicados visíveis.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const services = await db.service.findMany({
    where: publicServiceWhere(),
    select: { slug: true, updatedAt: true, category: { select: { slug: true, parent: { select: { slug: true } } } } },
    orderBy: { publishedAt: "desc" },
    take: 45000,
  });
  const categorySlugs = new Set<string>();
  for (const s of services) {
    categorySlugs.add(s.category.slug);
    if (s.category.parent) categorySlugs.add(s.category.parent.slug);
  }
  return [
    { url: `${base}/` },
    { url: `${base}/servicos` },
    ...[...categorySlugs].map((slug) => ({ url: `${base}/categorias/${slug}` })),
    ...services.map((s) => ({ url: `${base}/servicos/${s.slug}`, lastModified: s.updatedAt })),
  ];
}
