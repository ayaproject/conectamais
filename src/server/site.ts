// Endereço público do site para links absolutos (canônico, sitemap, JSON-LD).
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
