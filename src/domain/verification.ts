// Documentos exigidos para verificação e regras do selo de prestador verificado.
// Regra pura, sem banco. Definida com o Rodrigo em 2026-10-09:
// - Pessoa física: RG ou CNH.
// - Pessoa jurídica: documentos da empresa e documento de identidade do dono.

export type ProviderKind = "INDIVIDUAL" | "COMPANY";
export type DocumentType = "RG" | "CNH" | "CNPJ_CARD" | "COMPANY_ACT";
export type DocumentSubject = "PERSON" | "COMPANY";
export type DocumentStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";

export type RequirementKey = "PERSON_ID" | "COMPANY_CNPJ" | "COMPANY_ACT";

export type Requirement = {
  key: RequirementKey;
  subject: DocumentSubject;
  acceptedTypes: readonly DocumentType[];
  label: string;
};

const PERSON_ID = (label: string): Requirement => ({
  key: "PERSON_ID",
  subject: "PERSON",
  acceptedTypes: ["RG", "CNH"],
  label,
});

export const REQUIREMENTS: Record<ProviderKind, readonly Requirement[]> = {
  INDIVIDUAL: [PERSON_ID("Documento de identidade (RG ou CNH)")],
  COMPANY: [
    { key: "COMPANY_CNPJ", subject: "COMPANY", acceptedTypes: ["CNPJ_CARD"], label: "Comprovante de inscrição no CNPJ" },
    {
      key: "COMPANY_ACT",
      subject: "COMPANY",
      acceptedTypes: ["COMPANY_ACT"],
      label: "Contrato social, requerimento de empresário ou CCMEI",
    },
    PERSON_ID("Documento de identidade do dono ou responsável (RG ou CNH)"),
  ],
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  RG: "RG",
  CNH: "CNH",
  CNPJ_CARD: "Comprovante de inscrição no CNPJ",
  COMPANY_ACT: "Contrato social / CCMEI",
};

export function findRequirement(kind: ProviderKind, key: string): Requirement | undefined {
  return REQUIREMENTS[kind].find((r) => r.key === key);
}

export type DocLike = { type: DocumentType; subject: DocumentSubject; status: DocumentStatus; uploadedAt: Date };

export type RequirementState = "MISSING" | "PENDING" | "ACCEPTED" | "REJECTED";

export function matchesRequirement(doc: Pick<DocLike, "type" | "subject">, req: Requirement): boolean {
  return doc.subject === req.subject && req.acceptedTypes.includes(doc.type);
}

// O documento vigente de um requisito é o envio mais recente não substituído.
export function currentDocument<T extends DocLike>(docs: readonly T[], req: Requirement): T | undefined {
  return docs
    .filter((d) => d.status !== "SUPERSEDED" && matchesRequirement(d, req))
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
}

export function requirementStates(kind: ProviderKind, docs: readonly DocLike[]) {
  return REQUIREMENTS[kind].map((req) => {
    const doc = currentDocument(docs, req);
    const state: RequirementState = doc ? (doc.status as RequirementState) : "MISSING";
    return { requirement: req, state };
  });
}

// Pode enviar para análise: todo requisito tem um documento que não foi recusado.
export function documentsReadyForSubmission(kind: ProviderKind, docs: readonly DocLike[]): string[] {
  return requirementStates(kind, docs)
    .filter((r) => r.state === "MISSING" || r.state === "REJECTED")
    .map((r) => `Envie: ${r.requirement.label}.`);
}

// Pode aprovar ou conceder o selo: todos os documentos exigidos foram aceitos.
export function allDocumentsAccepted(kind: ProviderKind, docs: readonly DocLike[]): boolean {
  return requirementStates(kind, docs).every((r) => r.state === "ACCEPTED");
}

export const BADGE_VALIDITY_MONTHS = 12;

export function badgeExpiry(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + BADGE_VALIDITY_MONTHS);
  return d;
}

// O selo só aparece para prestador aprovado e dentro da validade.
export function isBadgeActive(
  p: { status: string; verifiedUntil: Date | null },
  now: Date = new Date(),
): boolean {
  return p.status === "APPROVED" && !!p.verifiedUntil && p.verifiedUntil > now;
}
