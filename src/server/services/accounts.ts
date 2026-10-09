import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { Db } from "../db";
import { DomainError } from "../errors";
import { audit } from "../audit";
import { getDummyHash, hashPassword, verifyPassword } from "../auth/password";
import { hashSessionToken, newSessionToken, SESSION_TTL_MS } from "../auth/tokens";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.email("E-mail inválido.").trim().toLowerCase().max(254),
  password: z.string().min(10, "A senha precisa ter pelo menos 10 caracteres.").max(200),
  asProvider: z.boolean(),
});

export type SignUpInput = z.input<typeof signUpSchema>;

// Cria a conta. Todo usuário é cliente; quem escolhe ser prestador ganha também
// o papel PROVIDER e um perfil em rascunho. ADMIN nunca é concedido por aqui.
export async function signUp(db: Db, input: SignUpInput) {
  const data = signUpSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          roles: { create: [{ role: "CLIENT" }, ...(data.asProvider ? [{ role: "PROVIDER" as const }] : [])] },
          ...(data.asProvider ? { providerProfile: { create: {} } } : {}),
        },
        select: { id: true, email: true, name: true },
      });
      await audit(tx, {
        actorId: user.id,
        action: "account.created",
        entityType: "User",
        entityId: user.id,
        details: { asProvider: data.asProvider },
      });
      return user;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DomainError("EMAIL_TAKEN", "Já existe uma conta com este e-mail.");
    }
    throw e;
  }
}

// Retorna o usuário só se e-mail e senha conferirem. A mensagem de erro é sempre a mesma.
export async function authenticate(db: Db, email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, passwordHash: true },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  return ok && user ? { id: user.id } : null;
}

export async function createSessionRecord(db: Db, userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function findSessionUser(db: Db, token: string) {
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.userId;
}

export async function deleteSessionRecord(db: Db, token: string) {
  await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}
