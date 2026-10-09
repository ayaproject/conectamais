const LABELS = {
  MISSING: ["Não enviado", "bg-slate-100 text-slate-800"],
  PENDING: ["Aguardando análise", "bg-amber-100 text-amber-900"],
  ACCEPTED: ["Aceito", "bg-emerald-100 text-emerald-900"],
  REJECTED: ["Recusado", "bg-red-100 text-red-900"],
  SUPERSEDED: ["Substituído", "bg-slate-100 text-slate-700"],
} as const;

export function DocumentStatus({ state }: { state: keyof typeof LABELS }) {
  const [label, cls] = LABELS[state];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function VerifiedBadge({ until }: { until: Date }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-900"
      title="Documentos conferidos pela equipe. Não é garantia da qualidade do serviço."
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M10 1l2.4 2.1 3.2-.3.6 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.6 3.1-3.2-.3L10 19l-2.4-2.1-3.2.3-.6-3.1-2.8-1.6L2.3 10 1 7.1l2.8-1.6.6-3.1 3.2.3L10 1zm-1.2 12.2l5-5-1.1-1.1-3.9 3.9-1.9-1.9-1.1 1.1 3 3z" />
      </svg>
      Documentos verificados
      <span className="sr-only">, válido até {until.toLocaleDateString("pt-BR")}</span>
    </span>
  );
}
