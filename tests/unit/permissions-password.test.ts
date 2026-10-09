import { describe, expect, it } from "vitest";
import { hasPermission } from "@/domain/permissions";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { missingForSubmission } from "@/domain/provider-profile";

describe("permissões", () => {
  it("permissão sem papel ADMIN não vale", () => {
    expect(hasPermission({ userId: "u", roles: ["CLIENT"], permissions: ["APPROVE_PROVIDERS"] }, "APPROVE_PROVIDERS")).toBe(false);
  });
  it("ADMIN sem a permissão específica não tem acesso", () => {
    expect(hasPermission({ userId: "u", roles: ["ADMIN"], permissions: ["READ_AUDIT_LOG"] }, "APPROVE_PROVIDERS")).toBe(false);
  });
});

describe("senhas", () => {
  it("confere a senha correta e recusa a errada", async () => {
    const h = await hashPassword("senha-segura-123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("senha-segura-123", h)).toBe(true);
    expect(await verifyPassword("senha-errada-123", h)).toBe(false);
  });
});

describe("perfil completo para envio", () => {
  it("aponta campos faltantes", () => {
    expect(missingForSubmission({ kind: "INDIVIDUAL" }).length).toBeGreaterThan(0);
  });
});
