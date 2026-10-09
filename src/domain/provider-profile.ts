import { z } from "zod";

// Campos do perfil exigidos nesta primeira entrega.
// Documentos, categorias, regiões e portfólio entram na Fase 4 completa.
export const providerProfileSchema = z.object({
  kind: z.enum(["INDIVIDUAL", "COMPANY"]),
  legalName: z.string().trim().min(3, "Informe o nome completo ou a razão social.").max(160),
  displayName: z.string().trim().min(2, "Informe o nome profissional.").max(80),
  description: z.string().trim().min(30, "Descreva seus serviços em pelo menos 30 caracteres.").max(2000),
  experience: z.string().trim().max(2000).default(""),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a sigla do estado, por exemplo SC."),
  website: z.union([z.literal(""), z.url("Endereço do site inválido.").max(300)]).default(""),
  googleBusinessUrl: z
    .union([z.literal(""), z.url("Link do Perfil da Empresa no Google inválido.").max(300)])
    .default(""),
});

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;

// Um rascunho só pode ir para análise se todos os campos obrigatórios estiverem válidos.
export function missingForSubmission(profile: Record<string, unknown>): string[] {
  const result = providerProfileSchema.safeParse(profile);
  if (result.success) return [];
  return result.error.issues.map((i) => i.message);
}
