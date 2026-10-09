import { z } from "zod";
import { canOfferServices, type ProviderStatus } from "./provider-status";

// Regras puras do catálogo: textos, preços, visibilidade e validação de serviços.

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return normalizeText(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Aceita "150", "150,5", "150,50", "1.234,56", "R$ 80". Retorna centavos ou null se inválido.
export function parseBRLToCents(input: string): number | null {
  const s = input.replace(/R\$\s?/i, "").trim();
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.replace(/\./g, "").split(",");
  return Number(int) * 100 + Number(dec.padEnd(2, "0"));
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const PRICE_UNITS = ["PER_SERVICE", "PER_HOUR", "PER_SQUARE_METER"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];
export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  PER_SERVICE: "por serviço",
  PER_HOUR: "por hora",
  PER_SQUARE_METER: "por m²",
};

export const MAX_PRICE_CENTS = 100_000_000; // R$ 1 milhão: acima disso é quase certamente erro de digitação

export const serviceInputSchema = z
  .object({
    title: z.string().trim().min(5, "O título precisa ter pelo menos 5 caracteres.").max(100),
    description: z.string().trim().min(30, "Descreva o serviço em pelo menos 30 caracteres.").max(3000),
    categoryId: z.string().min(1, "Escolha uma categoria."),
    pricingMode: z.enum(["FIXED", "QUOTE"]),
    price: z.string().trim().default(""),
    priceUnit: z.union([z.enum(PRICE_UNITS), z.literal("")]).default(""),
    estimatedDuration: z.string().trim().max(100).default(""),
    conditions: z.string().trim().max(1000).default(""),
    cityIds: z.array(z.string().min(1)).min(1, "Escolha pelo menos uma cidade atendida.").max(50),
  })
  .transform((v, ctx) => {
    if (v.pricingMode === "QUOTE") return { ...v, priceCents: null, priceUnit: null };
    const cents = parseBRLToCents(v.price);
    if (cents === null || cents <= 0 || cents > MAX_PRICE_CENTS) {
      ctx.addIssue({ code: "custom", message: "Informe um preço válido, por exemplo 150,00." });
      return z.NEVER;
    }
    if (!v.priceUnit) {
      ctx.addIssue({ code: "custom", message: "Informe a unidade do preço." });
      return z.NEVER;
    }
    return { ...v, priceCents: cents, priceUnit: v.priceUnit };
  });

export type ServiceInput = z.output<typeof serviceInputSchema>;

export type ServiceStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "REMOVED";

// Único ponto que decide se um serviço aparece publicamente.
export function isServicePubliclyVisible(s: {
  status: ServiceStatus;
  providerStatus: ProviderStatus;
  categoryActive: boolean;
  parentCategoryActive: boolean | null; // null quando a categoria não tem pai
}): boolean {
  return (
    s.status === "PUBLISHED" &&
    canOfferServices(s.providerStatus) &&
    s.categoryActive &&
    s.parentCategoryActive !== false
  );
}

export type OwnerServiceAction = "PUBLISH" | "PAUSE";

export function checkOwnerServiceAction(status: ServiceStatus, action: OwnerServiceAction): boolean {
  if (action === "PUBLISH") return status === "DRAFT" || status === "PAUSED";
  return status === "PUBLISHED";
}

export function canOwnerEditService(status: ServiceStatus): boolean {
  return status !== "REMOVED";
}

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  PAUSED: "Pausado",
  REMOVED: "Removido pela moderação",
};

export function searchTokens(q: string): string[] {
  return normalizeText(q)
    .split(" ")
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

export function priceLabel(s: { pricingMode: "FIXED" | "QUOTE"; priceCents: number | null; priceUnit: PriceUnit | null }): string {
  if (s.pricingMode === "FIXED" && s.priceCents !== null && s.priceUnit) {
    return `${formatBRL(s.priceCents)} ${PRICE_UNIT_LABELS[s.priceUnit]}`;
  }
  return "Sob orçamento";
}

// Lê os filtros da URL de busca sem confiar em nada: valores inválidos são ignorados.
export type SearchQuery = {
  q: string;
  category: string;
  city: string;
  maxPrice: string;
  maxPriceCents?: number;
  mode?: "FIXED" | "QUOTE";
  verifiedOnly: boolean;
  page: number;
};

const SLUG = /^[a-z0-9-]{1,100}$/;

export function parseSearchQuery(raw: Record<string, string | string[] | undefined>): SearchQuery {
  const one = (k: string) => {
    const v = raw[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const category = one("categoria");
  const city = one("cidade");
  const maxPrice = one("preco_max");
  const cents = maxPrice ? parseBRLToCents(maxPrice) : null;
  const mode = one("modalidade");
  const page = Number.parseInt(one("pagina"), 10);
  return {
    q: one("q").slice(0, 100),
    category: SLUG.test(category) ? category : "",
    city: SLUG.test(city) ? city : "",
    maxPrice: cents !== null ? maxPrice : "",
    maxPriceCents: cents ?? undefined,
    mode: mode === "FIXED" || mode === "QUOTE" ? mode : undefined,
    verifiedOnly: one("verificados") === "1",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}
