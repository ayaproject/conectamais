import Link from "next/link";
import { getPrincipal } from "@/server/auth/session";
import { adminAreasFor } from "@/domain/admin-areas";

// Navegação do painel. A autorização de verdade fica em cada página e em cada serviço.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const principal = await getPrincipal();
  const areas = principal ? adminAreasFor(principal) : [];
  return (
    <div className="space-y-6">
      {areas.length > 1 && (
        <nav aria-label="Administração" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
          {areas.map((a) => (
            <Link key={a.href} href={a.href} className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100">
              {a.label}
            </Link>
          ))}
        </nav>
      )}
      {children}
    </div>
  );
}
