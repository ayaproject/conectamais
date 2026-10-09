import Link from "next/link";
import { getPrincipal } from "@/server/auth/session";
import { signOutAction } from "@/app/actions/auth";
import { hasRole } from "@/domain/permissions";

export async function SiteHeader() {
  const principal = await getPrincipal();
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3" aria-label="Principal">
        <Link href="/" className="text-lg font-bold text-emerald-800">
          Conecta+
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {principal ? (
            <>
              <Link href="/conta" className="hover:underline">Minha conta</Link>
              {hasRole(principal, "PROVIDER") && <Link href="/prestador" className="hover:underline">Área do prestador</Link>}
              {principal.permissions.length > 0 && hasRole(principal, "ADMIN") && (
                <Link href="/admin/prestadores" className="hover:underline">Administração</Link>
              )}
              <form action={signOutAction}>
                <button type="submit" className="text-slate-600 hover:underline">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="hover:underline">Entrar</Link>
              <Link href="/cadastro" className="rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
