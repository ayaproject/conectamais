import { db } from "@/server/db";
import { getStorage } from "@/server/storage";
import { getPrincipal } from "@/server/auth/session";
import { readDocumentFile } from "@/server/services/verification";
import { DomainError } from "@/server/errors";

// Entrega um documento de verificação apenas ao dono ou a administradores autorizados.
export async function GET(_: Request, ctx: RouteContext<"/documentos/[id]">) {
  const principal = await getPrincipal();
  if (!principal) return new Response("Não encontrado", { status: 404 });
  const { id } = await ctx.params;
  try {
    const file = await readDocumentFile(db, getStorage(), principal, id);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    if (e instanceof DomainError && e.code === "NOT_FOUND") return new Response("Não encontrado", { status: 404 });
    throw e;
  }
}
