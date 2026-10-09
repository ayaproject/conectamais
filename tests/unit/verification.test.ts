import { describe, expect, it } from "vitest";
import { checkDocumentFile, MAX_DOCUMENT_BYTES, sanitizeFileName } from "@/domain/file-validation";
import {
  allDocumentsAccepted,
  badgeExpiry,
  documentsReadyForSubmission,
  isBadgeActive,
  REQUIREMENTS,
  type DocLike,
} from "@/domain/verification";

const doc = (p: Partial<DocLike>): DocLike => ({ type: "RG", subject: "PERSON", status: "PENDING", uploadedAt: new Date(), ...p });

describe("exigências de documentos", () => {
  it("pessoa física: um documento de identidade", () => {
    expect(REQUIREMENTS.INDIVIDUAL.map((r) => r.key)).toEqual(["PERSON_ID"]);
    expect(REQUIREMENTS.INDIVIDUAL[0].acceptedTypes).toEqual(["RG", "CNH"]);
  });

  it("empresa: CNPJ, ato constitutivo e identidade do dono", () => {
    expect(REQUIREMENTS.COMPANY.map((r) => r.key)).toEqual(["COMPANY_CNPJ", "COMPANY_ACT", "PERSON_ID"]);
  });

  it("documento recusado impede o envio; aceito libera aprovação", () => {
    expect(documentsReadyForSubmission("INDIVIDUAL", [doc({ status: "REJECTED" })])).toHaveLength(1);
    expect(documentsReadyForSubmission("INDIVIDUAL", [doc({ type: "CNH" })])).toEqual([]);
    expect(allDocumentsAccepted("INDIVIDUAL", [doc({})])).toBe(false);
    expect(allDocumentsAccepted("INDIVIDUAL", [doc({ status: "ACCEPTED" })])).toBe(true);
  });

  it("o envio mais recente é o que vale", () => {
    const old = doc({ status: "ACCEPTED", uploadedAt: new Date(2026, 0, 1) });
    const recent = doc({ status: "REJECTED", uploadedAt: new Date(2026, 5, 1) });
    expect(allDocumentsAccepted("INDIVIDUAL", [old, recent])).toBe(false);
  });
});

describe("selo", () => {
  it("vale 12 meses e só para aprovado", () => {
    const from = new Date(2026, 9, 9);
    expect(badgeExpiry(from)).toEqual(new Date(2027, 9, 9));
    const until = new Date(2027, 0, 1);
    expect(isBadgeActive({ status: "APPROVED", verifiedUntil: until }, new Date(2026, 11, 1))).toBe(true);
    expect(isBadgeActive({ status: "SUSPENDED", verifiedUntil: until }, new Date(2026, 11, 1))).toBe(false);
    expect(isBadgeActive({ status: "APPROVED", verifiedUntil: until }, new Date(2027, 0, 2))).toBe(false);
  });
});

describe("validação de arquivos", () => {
  it("detecta o tipo pelo conteúdo", () => {
    expect(checkDocumentFile(new Uint8Array(Buffer.from("%PDF-1.7")))).toMatchObject({ ok: true, mime: "application/pdf" });
    expect(checkDocumentFile(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ ok: true, mime: "image/jpeg" });
    expect(checkDocumentFile(new Uint8Array(Buffer.from("GIF89a"))).ok).toBe(false);
    expect(checkDocumentFile(new Uint8Array()).ok).toBe(false);
  });

  it("recusa arquivos acima de 8 MB", () => {
    const big = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
    big.set(Buffer.from("%PDF-"));
    expect(checkDocumentFile(big)).toEqual({ ok: false, error: "O arquivo passa de 8 MB." });
  });

  it("limpa o nome do arquivo", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName('C:\\fotos\\rg "frente".pdf')).toBe("rg frente.pdf");
    expect(sanitizeFileName("")).toBe("documento");
  });
});
