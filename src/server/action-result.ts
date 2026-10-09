import { DomainError } from "./errors";

export type ActionState = { error?: string; ok?: string } | undefined;

// Converte erros de regra de negócio em mensagens; erros inesperados são registrados sem dados pessoais.
export function toActionError(e: unknown): ActionState {
  if (e instanceof DomainError) return { error: e.message };
  console.error("Erro inesperado em ação:", e instanceof Error ? e.name : typeof e);
  return { error: "Não foi possível concluir a operação. Tente novamente." };
}
