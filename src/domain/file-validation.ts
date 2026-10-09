// Validação de arquivos enviados. O tipo é detectado pelo conteúdo (assinatura do arquivo),
// nunca pelo nome ou pelo tipo informado pelo navegador.

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; bytes: number[] }[] = [
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

export type FileCheck = { ok: true; mime: string; ext: string } | { ok: false; error: string };

export function checkDocumentFile(bytes: Uint8Array): FileCheck {
  if (bytes.length === 0) return { ok: false, error: "O arquivo está vazio." };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { ok: false, error: "O arquivo passa de 8 MB." };
  const sig = SIGNATURES.find((s) => s.bytes.every((b, i) => bytes[i] === b));
  if (!sig) return { ok: false, error: "Envie um arquivo PDF, JPG ou PNG." };
  return { ok: true, mime: sig.mime, ext: sig.ext };
}

// Nome original só para exibição: sem caminhos nem caracteres de controle.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f"<>]/g, "").trim().slice(0, 120);
  return clean || "documento";
}
