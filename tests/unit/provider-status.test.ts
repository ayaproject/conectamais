import { describe, expect, it } from "vitest";
import {
  canEditProfile,
  canOfferServices,
  checkProviderTransition,
  PROVIDER_STATUSES,
} from "@/domain/provider-status";

describe("máquina de estados do cadastro de prestador", () => {
  it("prestador envia rascunho para análise", () => {
    expect(checkProviderTransition("DRAFT", "SUBMIT", "OWNER")).toEqual({ ok: true, to: "IN_REVIEW" });
  });

  it("prestador não pode se aprovar", () => {
    expect(checkProviderTransition("IN_REVIEW", "APPROVE", "OWNER")).toEqual({ ok: false, error: "FORBIDDEN_ACTOR" });
  });

  it("rascunho não pode ser aprovado direto", () => {
    expect(checkProviderTransition("DRAFT", "APPROVE", "ADMIN")).toEqual({ ok: false, error: "INVALID_TRANSITION" });
  });

  it("pedir correções e rejeitar exigem motivo", () => {
    expect(checkProviderTransition("IN_REVIEW", "REQUEST_CHANGES", "ADMIN", "  ")).toEqual({
      ok: false,
      error: "REASON_REQUIRED",
    });
    expect(checkProviderTransition("IN_REVIEW", "REJECT", "ADMIN")).toEqual({ ok: false, error: "REASON_REQUIRED" });
    expect(checkProviderTransition("IN_REVIEW", "REJECT", "ADMIN", "Dados inconsistentes")).toEqual({
      ok: true,
      to: "REJECTED",
    });
  });

  it("após correções o prestador reenvia", () => {
    expect(checkProviderTransition("CHANGES_REQUESTED", "SUBMIT", "OWNER")).toEqual({ ok: true, to: "IN_REVIEW" });
  });

  it("desativado é final", () => {
    for (const action of ["SUBMIT", "APPROVE", "REINSTATE", "DEACTIVATE"] as const) {
      expect(checkProviderTransition("DEACTIVATED", action, "ADMIN", "x").ok).toBe(false);
    }
  });

  it("somente APPROVED pode oferecer serviços", () => {
    for (const s of PROVIDER_STATUSES) expect(canOfferServices(s)).toBe(s === "APPROVED");
  });

  it("perfil só é editável em rascunho ou aguardando correções", () => {
    expect(PROVIDER_STATUSES.filter(canEditProfile)).toEqual(["DRAFT", "CHANGES_REQUESTED"]);
  });
});
