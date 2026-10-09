// Máquina de estados do cadastro de prestador.
// Regra pura, sem banco: quem pode levar o cadastro de um estado a outro.

export const PROVIDER_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DEACTIVATED",
] as const;

export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export type ProviderAction =
  | "SUBMIT" // prestador envia para análise
  | "APPROVE" // admin aprova
  | "REQUEST_CHANGES" // admin pede correções
  | "REJECT" // admin rejeita
  | "SUSPEND" // admin suspende um aprovado
  | "REINSTATE" // admin reativa um suspenso
  | "DEACTIVATE"; // prestador ou admin desativa

export type ActorKind = "OWNER" | "ADMIN";

type Transition = {
  from: readonly ProviderStatus[];
  to: ProviderStatus;
  actors: readonly ActorKind[];
  requiresReason: boolean;
};

export const PROVIDER_TRANSITIONS: Record<ProviderAction, Transition> = {
  SUBMIT: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "IN_REVIEW", actors: ["OWNER"], requiresReason: false },
  APPROVE: { from: ["IN_REVIEW"], to: "APPROVED", actors: ["ADMIN"], requiresReason: false },
  REQUEST_CHANGES: { from: ["IN_REVIEW"], to: "CHANGES_REQUESTED", actors: ["ADMIN"], requiresReason: true },
  REJECT: { from: ["IN_REVIEW"], to: "REJECTED", actors: ["ADMIN"], requiresReason: true },
  SUSPEND: { from: ["APPROVED"], to: "SUSPENDED", actors: ["ADMIN"], requiresReason: true },
  REINSTATE: { from: ["SUSPENDED"], to: "APPROVED", actors: ["ADMIN"], requiresReason: false },
  DEACTIVATE: {
    from: ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUSPENDED"],
    to: "DEACTIVATED",
    actors: ["OWNER", "ADMIN"],
    requiresReason: false,
  },
};

export type TransitionCheck =
  | { ok: true; to: ProviderStatus }
  | { ok: false; error: "INVALID_TRANSITION" | "FORBIDDEN_ACTOR" | "REASON_REQUIRED" };

export function checkProviderTransition(
  current: ProviderStatus,
  action: ProviderAction,
  actor: ActorKind,
  reason?: string | null,
): TransitionCheck {
  const t = PROVIDER_TRANSITIONS[action];
  if (!t.from.includes(current)) return { ok: false, error: "INVALID_TRANSITION" };
  if (!t.actors.includes(actor)) return { ok: false, error: "FORBIDDEN_ACTOR" };
  if (t.requiresReason && !reason?.trim()) return { ok: false, error: "REASON_REQUIRED" };
  return { ok: true, to: t.to };
}

// O prestador só edita o perfil enquanto ele não está em análise nem aprovado.
// Edição de perfil aprovado com nova análise fica para uma fase seguinte.
export function canEditProfile(status: ProviderStatus): boolean {
  return status === "DRAFT" || status === "CHANGES_REQUESTED";
}

// Único ponto que decide se um prestador pode publicar serviços e receber contratações.
export function canOfferServices(status: ProviderStatus): boolean {
  return status === "APPROVED";
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em análise",
  CHANGES_REQUESTED: "Aguardando correções",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  SUSPENDED: "Suspenso",
  DEACTIVATED: "Desativado",
};
