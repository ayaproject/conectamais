import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAnyPermission } from "@/server/auth/session";
import { getProviderForAdmin } from "@/server/services/providers";
import { DomainError } from "@/server/errors";
import { hasPermission } from "@/domain/permissions";
import { PROVIDER_STATUS_LABELS, PROVIDER_TRANSITIONS, type ProviderAction } from "@/domain/provider-status";
import { StatusBadge } from "@/components/status-badge";
import { DecisionForm } from "./decision-form";
import { BadgeForm, DocumentReviewForm } from "./verification-forms";
import { getVerificationForAdmin } from "@/server/services/verification";
import { DocumentStatus, VerifiedBadge } from "@/components/document-status";
import { DOCUMENT_TYPE_LABELS } from "@/domain/verification";

export const metadata: Metadata = { title: "Análise de cadastro", robots: { index: false } };

const ACTIONS: { action: ProviderAction; label: string; variant: "primary" | "secondary" | "danger"; perm: "APPROVE_PROVIDERS" | "SUSPEND_PROVIDERS" }[] = [
  { action: "APPROVE", label: "Aprovar", variant: "primary", perm: "APPROVE_PROVIDERS" },
  { action: "REQUEST_CHANGES", label: "Pedir correções", variant: "secondary", perm: "APPROVE_PROVIDERS" },
  { action: "REJECT", label: "Rejeitar", variant: "danger", perm: "APPROVE_PROVIDERS" },
  { action: "SUSPEND", label: "Suspender", variant: "danger", perm: "SUSPEND_PROVIDERS" },
  { action: "REINSTATE", label: "Reativar", variant: "primary", perm: "SUSPEND_PROVIDERS" },
  { action: "DEACTIVATE", label: "Desativar", variant: "danger", perm: "SUSPEND_PROVIDERS" },
];

const KIND = { INDIVIDUAL: "Pessoa física", COMPANY: "Pessoa jurídica" } as const;

export default async function Page({ params }: PageProps<"/admin/prestadores/[id]">) {
  const principal = await requireAnyPermission("APPROVE_PROVIDERS", "SUSPEND_PROVIDERS", "VERIFY_DOCUMENTS");
  const { id } = await params;
  let p;
  try {
    p = await getProviderForAdmin(db, principal, id);
  } catch (e) {
    if (e instanceof DomainError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const isSelf = p.userId === principal.userId;
  const canSeeDocs = hasPermission(principal, "VERIFY_DOCUMENTS") || hasPermission(principal, "APPROVE_PROVIDERS");
  const canVerify = hasPermission(principal, "VERIFY_DOCUMENTS") && !isSelf;
  const v = canSeeDocs ? await getVerificationForAdmin(db, principal, p.id) : null;
  const options = isSelf
    ? []
    : ACTIONS.filter((a) => PROVIDER_TRANSITIONS[a.action].from.includes(p.status) && hasPermission(principal, a.perm));

  const rows: [string, React.ReactNode][] = [
    ["Tipo", KIND[p.kind]],
    ["Nome completo / razão social", p.legalName || "—"],
    ["Nome profissional", p.displayName || "—"],
    ["Conta", `${p.user.name} · ${p.user.email}`],
    ["Cidade", p.city ? `${p.city}/${p.state}` : "—"],
    ["Descrição", p.description || "—"],
    ["Experiência", p.experience || "—"],
    ["Site", p.website ?? "—"],
    ["Perfil da Empresa no Google", p.googleBusinessUrl ?? "—"],
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/prestadores" className="text-sm text-emerald-800 underline">← Voltar para a lista</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{p.displayName || "(sem nome)"}</h1>
        <StatusBadge status={p.status} />
        {v?.badgeActive && v.verifiedUntil && <VerifiedBadge until={v.verifiedUntil} />}
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="whitespace-pre-line break-words font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {v && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-semibold">Documentos</h2>
          <ul className="space-y-4">
            {v.items.map(({ requirement, document }) => (
              <li key={requirement.key} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{requirement.label}</span>
                  <DocumentStatus state={document?.status ?? "MISSING"} />
                </div>
                {document && (
                  <>
                    <p className="mt-1 text-sm text-slate-600">
                      {DOCUMENT_TYPE_LABELS[document.type]} ·{" "}
                      <a href={`/documentos/${document.id}`} target="_blank" rel="noopener" className="text-emerald-800 underline">
                        Abrir {document.originalName}
                      </a>{" "}
                      · enviado em {document.uploadedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                    {document.reviewedBy && (
                      <p className="mt-1 text-xs text-slate-500">
                        Analisado por {document.reviewedBy.name}
                        {document.reviewNote && ` · ${document.reviewNote}`}
                      </p>
                    )}
                    {canVerify && document.status === "PENDING" && p.status === "IN_REVIEW" && (
                      <DocumentReviewForm providerId={p.id} documentId={document.id} />
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {p.status === "IN_REVIEW" && !v.allAccepted && (
            <p className="mt-3 text-sm text-slate-600">
              O cadastro só pode ser aprovado depois que todos os documentos exigidos forem aceitos.
            </p>
          )}
        </section>
      )}

      {v && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-1 text-lg font-semibold">Selo de prestador verificado</h2>
          <p className="mb-3 text-sm text-slate-600">
            Indica apenas que os documentos foram conferidos. Não é garantia da qualidade do serviço.
          </p>
          <p className="mb-3 text-sm">
            {v.badgeActive && v.verifiedUntil
              ? `Ativo, válido até ${v.verifiedUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
              : "Sem selo."}
          </p>
          {canVerify && v.badgeActive && <BadgeForm providerId={p.id} mode="REVOKE" />}
          {canVerify && !v.badgeActive && p.status === "APPROVED" && v.allAccepted && (
            <BadgeForm providerId={p.id} mode="GRANT" />
          )}
          {v.badgeHistory.length > 0 && (
            <ol className="mt-4 space-y-1 text-sm">
              {v.badgeHistory.map((h) => (
                <li key={h.id}>
                  <time dateTime={h.createdAt.toISOString()} className="text-slate-500">
                    {h.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </time>{" "}
                  · {h.decision === "GRANTED" ? "Selo concedido" : "Selo removido"} por {h.actor.name}
                  {h.validUntil && ` (válido até ${h.validUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })})`}
                  {h.note && <span className="block text-slate-600">{h.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-semibold">Decisão</h2>
        {isSelf ? (
          <p className="text-sm text-slate-600">Você não pode analisar o próprio cadastro.</p>
        ) : options.length ? (
          <DecisionForm providerId={p.id} options={options} />
        ) : (
          <p className="text-sm text-slate-600">Nenhuma ação disponível para você no status atual.</p>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        {p.statusHistory.length === 0 ? (
          <p className="text-sm text-slate-600">Sem mudanças de status ainda.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {p.statusHistory.map((h) => (
              <li key={h.id}>
                <time dateTime={h.createdAt.toISOString()} className="text-slate-500">
                  {h.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </time>{" "}
                · {PROVIDER_STATUS_LABELS[h.fromStatus]} → <strong>{PROVIDER_STATUS_LABELS[h.toStatus]}</strong> por {h.actor.name}
                {h.reason && <span className="block text-slate-600">Motivo: {h.reason}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
