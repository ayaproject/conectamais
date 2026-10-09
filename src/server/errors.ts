// Erro de regra de negócio com código estável e mensagem pronta para o usuário.
export class DomainError extends Error {
  constructor(
    public readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_INPUT"
      | "INVALID_TRANSITION"
      | "CONFLICT"
      | "EMAIL_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
