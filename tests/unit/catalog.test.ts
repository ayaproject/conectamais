import { describe, expect, it } from "vitest";
import {
  canOwnerEditService,
  checkOwnerServiceAction,
  formatBRL,
  isServicePubliclyVisible,
  normalizeText,
  parseBRLToCents,
  parseSearchQuery,
  priceLabel,
  searchTokens,
  serviceInputSchema,
  slugify,
} from "@/domain/catalog";
import { adminAreasFor } from "@/domain/admin-areas";

describe("textos", () => {
  it("normaliza acentos e espaços", () => {
    expect(normalizeText("  Higienização   de  Estofados ")).toBe("higienizacao de estofados");
    expect(slugify("Montagem de móveis")).toBe("montagem-de-moveis");
    expect(slugify("Impermeabilização!!")).toBe("impermeabilizacao");
    expect(searchTokens("a Pintura  de Casa")).toEqual(["pintura", "de", "casa"]);
  });
});

describe("preço", () => {
  it.each([
    ["150", 15000],
    ["150,5", 15050],
    ["150,50", 15050],
    ["1.234,56", 123456],
    ["R$ 80", 8000],
    ["0,99", 99],
  ])("%s → %d centavos", (s, c) => expect(parseBRLToCents(s)).toBe(c));

  it.each(["", "abc", "-10", "1,234", "12.34", "1.23,00", "10,999"])("recusa %j", (s) => expect(parseBRLToCents(s)).toBeNull());

  it("formata em reais", () => {
    expect(formatBRL(150050).replace(/\s/g, " ")).toBe("R$ 1.500,50");
    expect(priceLabel({ pricingMode: "QUOTE", priceCents: null, priceUnit: null })).toBe("Sob orçamento");
    expect(priceLabel({ pricingMode: "FIXED", priceCents: 5000, priceUnit: "PER_HOUR" })).toMatch(/50,00 por hora$/);
  });
});

describe("validação do serviço", () => {
  const base = {
    title: "Faxina completa",
    description: "Limpeza completa de casa com produtos próprios e equipe treinada.",
    categoryId: "c1",
    pricingMode: "FIXED",
    price: "200",
    priceUnit: "PER_SERVICE",
    cityIds: ["x"],
  };
  it("aceita preço fixo e converte para centavos", () => {
    const r = serviceInputSchema.parse(base);
    expect(r.priceCents).toBe(20000);
  });
  it("sob orçamento descarta preço", () => {
    const r = serviceInputSchema.parse({ ...base, pricingMode: "QUOTE", priceUnit: "" });
    expect(r.priceCents).toBeNull();
    expect(r.priceUnit).toBeNull();
  });
  it("recusa preço zero, sem unidade, sem cidade e descrição curta", () => {
    expect(serviceInputSchema.safeParse({ ...base, price: "0" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, price: "20.000.000,00" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, priceUnit: "" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, cityIds: [] }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, description: "curta" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, pricingMode: "GRATIS" }).success).toBe(false);
  });
});

describe("regras de status", () => {
  it("visibilidade pública", () => {
    const ok = { status: "PUBLISHED", providerStatus: "APPROVED", categoryActive: true, parentCategoryActive: null } as const;
    expect(isServicePubliclyVisible(ok)).toBe(true);
    expect(isServicePubliclyVisible({ ...ok, status: "PAUSED" })).toBe(false);
    expect(isServicePubliclyVisible({ ...ok, providerStatus: "SUSPENDED" })).toBe(false);
    expect(isServicePubliclyVisible({ ...ok, categoryActive: false })).toBe(false);
    expect(isServicePubliclyVisible({ ...ok, parentCategoryActive: false })).toBe(false);
  });
  it("ações do dono", () => {
    expect(checkOwnerServiceAction("DRAFT", "PUBLISH")).toBe(true);
    expect(checkOwnerServiceAction("PAUSED", "PUBLISH")).toBe(true);
    expect(checkOwnerServiceAction("REMOVED", "PUBLISH")).toBe(false);
    expect(checkOwnerServiceAction("PUBLISHED", "PAUSE")).toBe(true);
    expect(checkOwnerServiceAction("DRAFT", "PAUSE")).toBe(false);
    expect(canOwnerEditService("REMOVED")).toBe(false);
    expect(canOwnerEditService("PAUSED")).toBe(true);
  });
});

describe("filtros da URL", () => {
  it("ignora valores inválidos", () => {
    const q = parseSearchQuery({ q: " pintura ", categoria: "<script>", cidade: "imbituba-sc", preco_max: "abc", modalidade: "X", pagina: "-3" });
    expect(q).toMatchObject({ q: "pintura", category: "", city: "imbituba-sc", maxPrice: "", mode: undefined, verifiedOnly: false, page: 1 });
    expect(parseSearchQuery({ preco_max: "300", modalidade: "QUOTE", verificados: "1", pagina: "9999" })).toMatchObject({
      maxPriceCents: 30000,
      mode: "QUOTE",
      verifiedOnly: true,
      page: 500,
    });
  });
});

describe("áreas do painel", () => {
  it("mostra só o que a permissão libera", () => {
    const p = { userId: "u", roles: ["ADMIN"], permissions: ["MANAGE_CATALOG"] } as const;
    expect(adminAreasFor(p).map((a) => a.href)).toEqual(["/admin/catalogo"]);
    expect(adminAreasFor({ ...p, roles: ["CLIENT"] })).toEqual([]);
  });
});
