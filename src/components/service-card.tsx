import Link from "next/link";
import { priceLabel } from "@/domain/catalog";
import { VerifiedBadge } from "./document-status";
import type { PriceUnit } from "@/domain/catalog";

export type ServiceCardData = {
  slug: string;
  title: string;
  description: string;
  pricingMode: "FIXED" | "QUOTE";
  priceCents: number | null;
  priceUnit: PriceUnit | null;
  category: { name: string };
  cities: { city: { name: string } }[];
  provider: { displayName: string; verifiedUntil: Date | null };
};

export function ServiceCard({ s, now }: { s: ServiceCardData; now: Date }) {
  const verified = s.provider.verifiedUntil && s.provider.verifiedUntil > now;
  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">
          <Link href={`/servicos/${s.slug}`} className="text-emerald-800 hover:underline">{s.title}</Link>
        </h3>
        <span className="text-sm font-medium text-slate-900">{priceLabel(s)}</span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {s.provider.displayName}
        {verified && s.provider.verifiedUntil && <VerifiedBadge until={s.provider.verifiedUntil} />}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{s.description}</p>
      <p className="mt-2 text-xs text-slate-500">
        {s.category.name} · {s.cities.map((c) => c.city.name).join(", ")}
      </p>
    </li>
  );
}
