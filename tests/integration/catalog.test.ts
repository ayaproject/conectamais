import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { approvedProvider, db, makeUser, resetDb } from "./helpers";
import { createCategory, createCity, setCategoryActive, setCityActive, updateCategory } from "@/server/services/catalog-admin";
import {
  changeOwnServiceStatus,
  createOwnService,
  getOwnService,
  removeServiceByModeration,
  updateOwnService,
} from "@/server/services/provider-services";
import { getPublicService, publicCategoriesWithCounts, searchServices } from "@/server/services/search";
import { adminDecideProvider } from "@/server/services/providers";
import type { Principal } from "@/domain/permissions";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function ids() {
  const cat = (slug: string) => db.category.findUniqueOrThrow({ where: { slug } }).then((c) => c.id);
  const city = (slug: string) => db.city.findUniqueOrThrow({ where: { slug } }).then((c) => c.id);
  return {
    pintura: await cat("pintura"),
    faxina: await cat("faxina"),
    imbituba: await city("imbituba-sc"),
    garopaba: await city("garopaba-sc"),
  };
}

function input(o: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Pintura de apartamento",
    description: "Pintura interna completa com preparação de paredes, massa corrida e acabamento.",
    categoryId: "",
    pricingMode: "FIXED",
    price: "1.500,00",
    priceUnit: "PER_SERVICE",
    estimatedDuration: "3 dias",
    conditions: "",
    cityIds: [] as string[],
    ...o,
  };
}

async function publishedService(principal: Principal, o: Partial<Record<string, unknown>> = {}) {
  const i = await ids();
  const id = await createOwnService(db, principal, input({ categoryId: i.pintura, cityIds: [i.imbituba], ...o }));
  await changeOwnServiceStatus(db, principal, id, "PUBLISH");
  return db.service.findUniqueOrThrow({ where: { id } });
}

describe("catálogo inicial", () => {
  it("tem as 9 categorias e as cidades da região", async () => {
    expect(await db.category.count()).toBe(9);
    const names = (await db.city.findMany()).map((c) => c.name).sort();
    expect(names).toEqual(["Garopaba", "Imaruí", "Imbituba", "Laguna", "Paulo Lopes"]);
    const cats = await publicCategoriesWithCounts(db);
    expect(cats.map((c) => c.slug)).toContain("higienizacao");
    expect(cats.every((c) => c.count === 0)).toBe(true);
  });
});

describe("administração do catálogo", () => {
  it("exige MANAGE_CATALOG", async () => {
    const other = await makeUser({ admin: ["APPROVE_PROVIDERS"] });
    await expect(createCategory(db, other.principal, { name: "Elétrica" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCity(db, other.principal, { name: "Tubarão", state: "SC" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cria subcategoria, recusa duplicada e terceiro nível, e audita", async () => {
    const { principal } = await makeUser({ admin: ["MANAGE_CATALOG"] });
    const { pintura } = await ids();
    const sub = await createCategory(db, principal, { name: "Pintura de fachada", parentId: pintura });
    await expect(createCategory(db, principal, { name: "Pintura" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createCategory(db, principal, { name: "Textura", parentId: sub })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await updateCategory(db, principal, sub, { name: "Pintura externa", parentId: pintura });
    const row = await db.category.findUniqueOrThrow({ where: { id: sub } });
    expect(row.slug).toBe("pintura-de-fachada"); // slug não muda ao renomear
    expect(await db.auditLog.count({ where: { entityType: "Category" } })).toBe(2);
  });

  it("cadastra cidade com UF validada", async () => {
    const { principal } = await makeUser({ admin: ["MANAGE_CATALOG"] });
    await expect(createCity(db, principal, { name: "Tubarão", state: "Santa Catarina" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    const id = await createCity(db, principal, { name: "Tubarão", state: "sc" });
    expect((await db.city.findUniqueOrThrow({ where: { id } })).slug).toBe("tubarao-sc");
    await expect(createCity(db, principal, { name: "Tubarão", state: "SC" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("serviços do prestador", () => {
  it("prestador não aprovado não cadastra serviço", async () => {
    const p = await makeUser({ provider: true });
    const i = await ids();
    await expect(createOwnService(db, p.principal, input({ categoryId: i.pintura, cityIds: [i.imbituba] }))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const client = await makeUser();
    await expect(createOwnService(db, client.principal, input())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cria como rascunho, valida preço e só aparece depois de publicar", async () => {
    const p = await approvedProvider();
    const i = await ids();
    await expect(
      createOwnService(db, p.principal, input({ categoryId: i.pintura, cityIds: [i.imbituba], price: "abc" })),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createOwnService(db, p.principal, input({ categoryId: i.pintura, cityIds: [] }))).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });

    const id = await createOwnService(db, p.principal, input({ categoryId: i.pintura, cityIds: [i.imbituba, i.garopaba] }));
    const s = await db.service.findUniqueOrThrow({ where: { id } });
    expect(s.status).toBe("DRAFT");
    expect(s.priceCents).toBe(150000);
    expect(await getPublicService(db, s.slug)).toBeNull();

    await changeOwnServiceStatus(db, p.principal, id, "PUBLISH");
    const pub = await getPublicService(db, s.slug);
    expect(pub?.title).toBe("Pintura de apartamento");
    // Só dados públicos do prestador
    expect(Object.keys(pub!.provider).sort()).toEqual(["city", "description", "displayName", "id", "state", "status", "verifiedUntil"]);

    await expect(changeOwnServiceStatus(db, p.principal, id, "PUBLISH")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await changeOwnServiceStatus(db, p.principal, id, "PAUSE");
    expect(await getPublicService(db, s.slug)).toBeNull();
  });

  it("sob orçamento não guarda preço", async () => {
    const p = await approvedProvider();
    const i = await ids();
    const id = await createOwnService(db, p.principal, input({ categoryId: i.faxina, cityIds: [i.imbituba], pricingMode: "QUOTE", price: "200" }));
    const s = await db.service.findUniqueOrThrow({ where: { id } });
    expect(s.priceCents).toBeNull();
    expect(s.priceUnit).toBeNull();
  });

  it("o banco recusa preço fixo sem valor", async () => {
    const p = await approvedProvider();
    const i = await ids();
    await expect(
      db.service.create({
        data: { providerId: p.profileId, categoryId: i.pintura, title: "x", slug: "x", description: "x", pricingMode: "FIXED", searchText: "x" },
      }),
    ).rejects.toThrow();
  });

  it("categoria ou cidade inativa é recusada", async () => {
    const p = await approvedProvider();
    const admin = await makeUser({ admin: ["MANAGE_CATALOG"] });
    const i = await ids();
    await setCategoryActive(db, admin.principal, i.faxina, false);
    await setCityActive(db, admin.principal, i.garopaba, false);
    await expect(createOwnService(db, p.principal, input({ categoryId: i.faxina, cityIds: [i.imbituba] }))).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(createOwnService(db, p.principal, input({ categoryId: i.pintura, cityIds: [i.garopaba] }))).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("serviço de outro prestador é tratado como inexistente", async () => {
    const a = await approvedProvider("Prestador A");
    const b = await approvedProvider("Prestador B");
    const s = await publishedService(a.principal);
    await expect(getOwnService(db, b.principal, s.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(updateOwnService(db, b.principal, s.id, input())).rejects.toMatchObject({ code: "NOT_FOUND" });
    const i = await ids();
    await expect(
      updateOwnService(db, b.principal, s.id, input({ categoryId: i.pintura, cityIds: [i.imbituba] })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(changeOwnServiceStatus(db, b.principal, s.id, "PAUSE")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("edição troca as cidades atendidas", async () => {
    const p = await approvedProvider();
    const i = await ids();
    const s = await publishedService(p.principal);
    await updateOwnService(db, p.principal, s.id, input({ categoryId: i.pintura, cityIds: [i.garopaba], title: "Pintura de casas" }));
    const cities = await db.serviceCity.findMany({ where: { serviceId: s.id } });
    expect(cities.map((c) => c.cityId)).toEqual([i.garopaba]);
    expect((await db.service.findUniqueOrThrow({ where: { id: s.id } })).status).toBe("PUBLISHED");
  });
});

describe("visibilidade pública", () => {
  it("prestador suspenso e categoria desativada escondem o serviço", async () => {
    const p = await approvedProvider();
    const s = await publishedService(p.principal);
    expect(await getPublicService(db, s.slug)).not.toBeNull();

    await adminDecideProvider(db, p.admin.principal, p.profileId, "SUSPEND", "Reclamações");
    expect(await getPublicService(db, s.slug)).toBeNull();
    expect((await searchServices(db, {})).total).toBe(0);
    await expect(changeOwnServiceStatus(db, p.principal, s.id, "PAUSE")).rejects.toMatchObject({ code: "FORBIDDEN" });

    await adminDecideProvider(db, p.admin.principal, p.profileId, "REINSTATE", "");
    expect(await getPublicService(db, s.slug)).not.toBeNull();

    const catalog = await makeUser({ admin: ["MANAGE_CATALOG"] });
    await setCategoryActive(db, catalog.principal, s.categoryId, false);
    expect(await getPublicService(db, s.slug)).toBeNull();
  });

  it("categoria principal desativada esconde serviços das subcategorias", async () => {
    const catalog = await makeUser({ admin: ["MANAGE_CATALOG"] });
    const i = await ids();
    const sub = await createCategory(db, catalog.principal, { name: "Pintura de fachada", parentId: i.pintura });
    const p = await approvedProvider();
    const s = await publishedService(p.principal, { categoryId: sub });
    expect((await searchServices(db, { category: "pintura" })).total).toBe(1);
    await setCategoryActive(db, catalog.principal, i.pintura, false);
    expect(await getPublicService(db, s.slug)).toBeNull();
  });
});

describe("busca", () => {
  it("filtra por texto sem acento, categoria, cidade, preço, modalidade e selo", async () => {
    const i = await ids();
    const a = await approvedProvider("Maria Pinturas");
    const b = await approvedProvider("Limpeza Total");
    await publishedService(a.principal, { title: "Pintura de apartamento", price: "1.500,00" });
    await publishedService(b.principal, {
      title: "Faxina residencial completa",
      description: "Limpeza de cozinha, banheiros e higienização de estofados com produtos próprios.",
      categoryId: i.faxina,
      cityIds: [i.garopaba],
      pricingMode: "QUOTE",
    });

    expect((await searchServices(db, {})).total).toBe(2);
    expect((await searchServices(db, { q: "HIGIENIZACAO" })).items[0].title).toBe("Faxina residencial completa");
    expect((await searchServices(db, { q: "pintura apartamento" })).total).toBe(1);
    expect((await searchServices(db, { q: "faxina" })).total).toBe(1); // nome da categoria também conta
    expect((await searchServices(db, { q: "maria" })).total).toBe(1); // nome do prestador
    expect((await searchServices(db, { category: "faxina" })).total).toBe(1);
    expect((await searchServices(db, { city: "garopaba-sc" })).total).toBe(1);
    expect((await searchServices(db, { mode: "QUOTE" })).total).toBe(1);
    expect((await searchServices(db, { maxPriceCents: 100000 })).total).toBe(0);
    expect((await searchServices(db, { maxPriceCents: 150000 })).total).toBe(1);
    expect((await searchServices(db, { verifiedOnly: true })).total).toBe(0);

    // Selo vigente vem primeiro
    await db.providerProfile.update({ where: { id: b.profileId }, data: { verifiedUntil: new Date(Date.now() + 86400000) } });
    const r = await searchServices(db, {});
    expect(r.items[0].provider.displayName).toBe("Limpeza Total");
    expect((await searchServices(db, { verifiedOnly: true })).total).toBe(1);
  });

  it("cidade desativada some do filtro", async () => {
    const i = await ids();
    const p = await approvedProvider();
    await publishedService(p.principal, { cityIds: [i.garopaba] });
    const catalog = await makeUser({ admin: ["MANAGE_CATALOG"] });
    await setCityActive(db, catalog.principal, i.garopaba, false);
    expect((await searchServices(db, { city: "garopaba-sc" })).total).toBe(0);
  });
});

describe("moderação", () => {
  it("exige MODERATE_SERVICES e motivo, remove e audita", async () => {
    const p = await approvedProvider();
    const s = await publishedService(p.principal);
    const noPerm = await makeUser({ admin: ["MANAGE_CATALOG"] });
    await expect(removeServiceByModeration(db, noPerm.principal, s.id, "spam")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const mod = await makeUser({ admin: ["MODERATE_SERVICES"] });
    await expect(removeServiceByModeration(db, mod.principal, s.id, "  ")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await removeServiceByModeration(db, mod.principal, s.id, "Contato direto na descrição");
    expect(await getPublicService(db, s.slug)).toBeNull();
    // O prestador não consegue republicar nem editar
    await expect(changeOwnServiceStatus(db, p.principal, s.id, "PUBLISH")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    const i = await ids();
    await expect(
      updateOwnService(db, p.principal, s.id, input({ categoryId: i.pintura, cityIds: [i.imbituba] })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "service.removed" } });
    expect(log.actorId).toBe(mod.user.id);
  });
});
