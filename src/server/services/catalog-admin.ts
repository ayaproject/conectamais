import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { hasPermission, type Principal } from "@/domain/permissions";
import { normalizeText, slugify } from "@/domain/catalog";

function requireCatalog(p: Principal) {
  if (!hasPermission(p, "MANAGE_CATALOG")) throw new DomainError("FORBIDDEN", "Você não tem permissão para gerenciar o catálogo.");
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(60),
  description: z.string().trim().max(500).default(""),
  parentId: z.string().trim().default(""),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

function parseCategory(input: unknown) {
  const r = categorySchema.safeParse(input);
  if (!r.success) throw new DomainError("INVALID_INPUT", r.error.issues.map((i) => i.message).join(" "));
  return r.data;
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Só dois níveis: categoria e subcategoria.
async function validParent(db: Db | Prisma.TransactionClient, parentId: string, selfId?: string) {
  if (!parentId) return null;
  if (parentId === selfId) throw new DomainError("INVALID_INPUT", "Uma categoria não pode ser subcategoria dela mesma.");
  const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
  if (!parent) throw new DomainError("INVALID_INPUT", "Categoria principal não encontrada.");
  if (parent.parentId) throw new DomainError("INVALID_INPUT", "Subcategorias não podem ter subcategorias.");
  if (selfId && (await db.category.count({ where: { parentId: selfId } })) > 0) {
    throw new DomainError("INVALID_INPUT", "Uma categoria com subcategorias não pode virar subcategoria.");
  }
  return parent.id;
}

export async function createCategory(db: Db, principal: Principal, input: unknown) {
  requireCatalog(principal);
  const data = parseCategory(input);
  const slug = slugify(data.name);
  if (!slug) throw new DomainError("INVALID_INPUT", "Nome de categoria inválido.");
  try {
    return await db.$transaction(async (tx) => {
      const parentId = await validParent(tx, data.parentId);
      const c = await tx.category.create({
        data: { name: data.name, description: data.description, parentId, sortOrder: data.sortOrder, slug, searchName: normalizeText(data.name) },
        select: { id: true },
      });
      await audit(tx, { actorId: principal.userId, action: "category.created", entityType: "Category", entityId: c.id, details: { name: data.name, parentId } });
      return c.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("CONFLICT", "Já existe uma categoria com esse nome.");
    throw e;
  }
}

// O slug não muda ao renomear, para não quebrar links já indexados.
export async function updateCategory(db: Db, principal: Principal, id: string, input: unknown) {
  requireCatalog(principal);
  const data = parseCategory(input);
  return db.$transaction(async (tx) => {
    const before = await tx.category.findUnique({ where: { id } });
    if (!before) throw new DomainError("NOT_FOUND", "Categoria não encontrada.");
    const parentId = await validParent(tx, data.parentId, id);
    await tx.category.update({
      where: { id },
      data: { name: data.name, description: data.description, parentId, sortOrder: data.sortOrder, searchName: normalizeText(data.name) },
    });
    await audit(tx, {
      actorId: principal.userId,
      action: "category.updated",
      entityType: "Category",
      entityId: id,
      details: { before: { name: before.name, parentId: before.parentId }, after: { name: data.name, parentId } },
    });
  });
}

export async function setCategoryActive(db: Db, principal: Principal, id: string, active: boolean) {
  requireCatalog(principal);
  return db.$transaction(async (tx) => {
    const res = await tx.category.updateMany({ where: { id }, data: { active } });
    if (res.count !== 1) throw new DomainError("NOT_FOUND", "Categoria não encontrada.");
    await audit(tx, { actorId: principal.userId, action: active ? "category.activated" : "category.deactivated", entityType: "Category", entityId: id });
  });
}

export async function listCategoriesForAdmin(db: Db, principal: Principal) {
  requireCatalog(principal);
  return db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  });
}

const citySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da cidade.").max(80),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a sigla do estado, por exemplo SC."),
});

export async function createCity(db: Db, principal: Principal, input: unknown) {
  requireCatalog(principal);
  const r = citySchema.safeParse(input);
  if (!r.success) throw new DomainError("INVALID_INPUT", r.error.issues.map((i) => i.message).join(" "));
  const { name, state } = r.data;
  try {
    return await db.$transaction(async (tx) => {
      const c = await tx.city.create({ data: { name, state, slug: `${slugify(name)}-${state.toLowerCase()}` }, select: { id: true } });
      await audit(tx, { actorId: principal.userId, action: "city.created", entityType: "City", entityId: c.id, details: { name, state } });
      return c.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DomainError("CONFLICT", "Essa cidade já está cadastrada.");
    throw e;
  }
}

export async function setCityActive(db: Db, principal: Principal, id: string, active: boolean) {
  requireCatalog(principal);
  return db.$transaction(async (tx) => {
    const res = await tx.city.updateMany({ where: { id }, data: { active } });
    if (res.count !== 1) throw new DomainError("NOT_FOUND", "Cidade não encontrada.");
    await audit(tx, { actorId: principal.userId, action: active ? "city.activated" : "city.deactivated", entityType: "City", entityId: id });
  });
}

export async function listCitiesForAdmin(db: Db, principal: Principal) {
  requireCatalog(principal);
  return db.city.findMany({ orderBy: [{ state: "asc" }, { name: "asc" }], include: { _count: { select: { services: true } } } });
}
