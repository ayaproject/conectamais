import { createHash, randomBytes } from "node:crypto";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

// O banco guarda só o hash: um vazamento da tabela não permite sequestrar sessões.
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
