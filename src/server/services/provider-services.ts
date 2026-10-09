import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { hasPermission, hasRole, type Principal } from "@/domain/permissions";
import { canOfferServices } from "@/domain/provider-status";
import {
  canOwnerEditService,
  checkOwnerServiceAction,
  normalizeText,
  serviceInputSchema,
  slugify,
  type OwnerServiceAction,
} from "@/domain/catalog";

type Tx = Prisma.TransactionClient;

async function requireApprovedProvider(db: Db | Tx, principal: Principal) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
  const profile = await db.providerProfile.findUnique({
    where: { userId: principal.userId },
    select: { id: true, status: true, displayName: true },
  });
  if (!profile) throw new DomainError("NOT_FOUND", "Perfil de prestador não encontrado.");
  if (!canOfferServices(profile.status)) {
    throw new DomainError("FORBIDDEN", "Só prestadores com cadastro aprovado podem cadastrar e publicar serviços.");
  }
  return profile;
}

function parseService(input: unknown) {
  const r = serviceInputSchema.safeParse(input);
  if (!r.success) throw new DomainError("INVALID_INPUT", r.error.issues.map((i) => i.message).join(" "));
  return r.data;
}

// Categoria precisa estar ativa (e a principal também); cidades precisam estar ativas.
async function checkReferences(tx: Tx, categoryId: string, cityIds: string[]) {
  const cat = await tx.category.findUnique({
    where: { id: categoryId },
    select: { active: true, parent: { select: { active: true } } },
  });
  if (!cat || !cat.active || cat.parent?.active === false) {
    throw new DomainError("INVALID_INPUT", "Categoria indisponível. Escolha outra.");
  }
  const unique = [...new Set(cityIds)];
  const cities = await tx.city.count({ where: { id: { in: unique }, active: true } });
  if (cities !== unique.length) throw new DomainError("INVALID_INPUT", "Uma das cidades escolhidas não é atendida pela plataforma.");
  return unique;
}

function serviceData(d: ReturnType<typeof parseService>) {
  return {
    title: d.title,
    description: d.description,
    categoryId: d.categoryId,
    pricingMode: d.pricingMode,
    priceCents: d.priceCents,
    priceUnit: d.priceUnit,
    estimatedDuration: d.estimatedDuration,
    conditions: d.conditions,
    searchText: normalizeText(`${d.title} ${d.description}`),
  };
}

// Autorização antes da validação: quem não pode cadastrar não recebe detalhes do formulário.
export async function createOwnService(db: Db, principal: Principal, input: unknown) {
  return db.$transaction(async (tx) => {
    const profile = await requireApprovedProvider(tx, principal);
    const d = parseService(input);
    const cityIds = await checkReferences(tx, d.categoryId, d.cityIds);
    // Slug estável com sufixo aleatório: evita colisão e não muda ao editar o título.
    const slug = `${slugify(d.title) || "servico"}-${randomBytes(3).toString("hex")}`;
    const s = await tx.service.create({
      data: { ...serviceData(d), slug, providerId: profile.id, cities: { create: cityIds.map((cityId) => ({ cityId })) } },
      select: { id: true },
    });
    await audit(tx, { actorId: principal.userId, action: "service.created", entityType: "Service", entityId: s.id });
    return s.id;
  });
}

async function ownService(tx: Tx, principal: Principal, serviceId: string) {
  const profile = await requireApprovedProvider(tx, principal);
  const service = await tx.service.findUnique({ where: { id: serviceId }, select: { id: true, providerId: true, status: true } });
  // Serviço de outro prestador é tratado como inexistente.
  if (!service || service.providerId !== profile.id) throw new DomainError("NOT_FOUND", "Serviço não encontrado.");
  return service;
}

export async function updateOwnService(db: Db, principal: Principal, serviceId: string, input: unknown) {
  return db.$transaction(async (tx) => {
    const service = await ownService(tx, principal, serviceId);
    const d = parseService(input);
    if (!canOwnerEditService(service.status)) throw new DomainError("FORBIDDEN", "Este serviço foi removido pela moderação.");
    const cityIds = await checkReferences(tx, d.categoryId, d.cityIds);
    const res = await tx.service.updateMany({ where: { id: service.id, status: service.status }, data: serviceData(d) });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O serviço mudou enquanto você editava. Recarregue a página.");
    await tx.serviceCity.deleteMany({ where: { serviceId: service.id } });
    await tx.serviceCity.createMany({ data: cityIds.map((cityId) => ({ serviceId: service.id, cityId })) });
    await audit(tx, { actorId: principal.userId, action: "service.updated", entityType: "Service", entityId: service.id });
  });
}

export async function changeOwnServiceStatus(db: Db, principal: Principal, serviceId: string, action: OwnerServiceAction) {
  return db.$transaction(async (tx) => {
    const service = await ownService(tx, principal, serviceId);
    if (!checkOwnerServiceAction(service.status, action)) {
      throw new DomainError("INVALID_TRANSITION", "Esta ação não é permitida no status atual do serviço.");
    }
    const to = action === "PUBLISH" ? "PUBLISHED" : "PAUSED";
    const res = await tx.service.updateMany({
      where: { id: service.id, status: service.status },
      data: { status: to, ...(to === "PUBLISHED" ? { publishedAt: new Date() } : {}) },
    });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O serviço mudou. Recarregue a página.");
    await audit(tx, {
      actorId: principal.userId,
      action: `service.${action.toLowerCase()}`,
      entityType: "Service",
      entityId: service.id,
      details: { from: service.status, to },
    });
  });
}

export async function listOwnServices(db: Db, principal: Principal) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
  return db.service.findMany({
    where: { provider: { userId: principal.userId } },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { name: true } }, cities: { include: { city: { select: { name: true } } } } },
  });
}

export async function getOwnService(db: Db, principal: Principal, serviceId: string) {
  if (!hasRole(principal, "PROVIDER")) throw new DomainError("FORBIDDEN", "Esta área é exclusiva para prestadores.");
  const s = await db.service.findFirst({
    where: { id: serviceId, provider: { userId: principal.userId } },
    include: { cities: { select: { cityId: true } } },
  });
  if (!s) throw new DomainError("NOT_FOUND", "Serviço não encontrado.");
  return s;
}

// Opções para o formulário: só categorias e cidades ativas.
export async function serviceFormOptions(db: Db) {
  const [categories, cities] = await Promise.all([
    db.category.findMany({
      where: { active: true, OR: [{ parentId: null }, { parent: { active: true } }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
    db.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, state: true } }),
  ]);
  return { categories, cities };
}

// ------------------------------------------------------------- moderação

export async function removeServiceByModeration(db: Db, principal: Principal, serviceId: string, reason: string) {
  if (!hasPermission(principal, "MODERATE_SERVICES")) throw new DomainError("FORBIDDEN", "Você não tem permissão para moderar serviços.");
  const note = reason?.trim();
  if (!note) throw new DomainError("INVALID_INPUT", "Informe o motivo da remoção.");
  return db.$transaction(async (tx) => {
    const s = await tx.service.findUnique({ where: { id: serviceId }, select: { id: true, status: true, provider: { select: { userId: true } } } });
    if (!s) throw new DomainError("NOT_FOUND", "Serviço não encontrado.");
    if (s.provider.userId === principal.userId) throw new DomainError("FORBIDDEN", "Um administrador não pode moderar os próprios serviços.");
    if (s.status === "REMOVED") throw new DomainError("INVALID_TRANSITION", "O serviço já foi removido.");
    const res = await tx.service.updateMany({ where: { id: s.id, status: s.status }, data: { status: "REMOVED", moderationNote: note } });
    if (res.count !== 1) throw new DomainError("CONFLICT", "O serviço mudou. Recarregue a página.");
    await audit(tx, { actorId: principal.userId, action: "service.removed", entityType: "Service", entityId: s.id, details: { from: s.status, reason: note } });
  });
}

export async function listServicesForModeration(db: Db, principal: Principal) {
  if (!hasPermission(principal, "MODERATE_SERVICES")) throw new DomainError("FORBIDDEN", "Você não tem permissão para moderar serviços.");
  return db.service.findMany({
    where: { status: { in: ["PUBLISHED", "PAUSED"] } },
    orderBy: { publishedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      category: { select: { name: true } },
      provider: { select: { displayName: true } },
    },
  });
}
