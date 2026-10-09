import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/conta", "/prestador", "/documentos", "/entrar", "/cadastro"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
