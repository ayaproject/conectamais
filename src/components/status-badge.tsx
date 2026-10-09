import { PROVIDER_STATUS_LABELS, type ProviderStatus } from "@/domain/provider-status";

const COLORS: Record<ProviderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-800",
  IN_REVIEW: "bg-amber-100 text-amber-900",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-900",
  APPROVED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  SUSPENDED: "bg-red-100 text-red-900",
  DEACTIVATED: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status]}`}>
      {PROVIDER_STATUS_LABELS[status]}
    </span>
  );
}
