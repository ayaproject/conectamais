import type { Metadata } from "next";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/session";
import { getOwnProviderProfile } from "@/server/services/providers";
import { canEditProfile, PROVIDER_STATUS_LABELS, PROVIDER_TRANSITIONS } from "@/domain/provider-status";
import { StatusBadge } from "@/components/status-badge";
import { DeactivateForm, ProfileForm, SubmitForReviewForm } from "./profile-form";
import { DocumentsSection } from "./documents";
import { getOwnVerification } from "@/server/services/verification";
import { VerifiedBadge } from "@/components/document-status";

export const metadata: Metadata = { title: "Área do prestador" };

const STATUS_HELP = {
  DRAFT: "Preencha seu perfil, salve e envie para análise.",
  IN_REVIEW: "Seu cadastro está com a nossa equipe. Você será avisado aqui quando houver uma decisão.",
  CHANGES_REQUESTED: "A equipe pediu ajustes. Corrija os pontos indicados abaixo e envie novamente.",
  APPROVED: "Cadastro aprovado. A publicação de serviços será liberada na próxima etapa da plataforma.",
  REJECTED: "Seu cadastro não foi aprovado. Veja o motivo no histórico abaixo.",
  SUSPENDED: "Seu cadastro está suspenso. Veja o motivo no histórico abaixo.",
  DEACTIVATED: "Este cadastro foi desativado.",
} as const;

export default async function Page() {
  const principal = await requireRole("PROVIDER");
  const profile = await getOwnProviderProfile(db, principal);
  const editable = canEditProfile(profile.status);
  const verification = await getOwnVerification(db, principal);
  const lastRequest = profile.statusHistory.find((h) => h.toStatus === "CHANGES_REQUESTED" && h.reason);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Área do prestador</h1>
        <StatusBadge status={profile.status} />
        {verification.badgeActive && verification.verifiedUntil && <VerifiedBadge until={verification.verifiedUntil} />}
      </div>
      <p className="text-slate-600">{STATUS_HELP[profile.status]}</p>

      {profile.status === "CHANGES_REQUESTED" && lastRequest && (
        <div role="note" className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <strong>Correções solicitadas:</strong> {lastRequest.reason}
        </div>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Perfil profissional</h2>
        <ProfileForm profile={profile} editable={editable} />
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Documentos para verificação</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          {profile.kind === "COMPANY"
            ? "Para empresas pedimos os documentos da empresa e o documento de identidade do dono ou responsável."
            : "Envie um documento de identidade com foto."}{" "}
          Os documentos são vistos apenas pela equipe de análise e nunca aparecem no seu perfil público.
          {editable && " Se mudar o tipo de cadastro, salve o perfil para atualizar esta lista."}
        </p>
        <DocumentsSection
          editable={editable}
          items={verification.items.map(({ requirement, document }) => ({
            key: requirement.key,
            label: requirement.label,
            acceptedTypes: requirement.acceptedTypes,
            document,
          }))}
        />
      </section>

      {PROVIDER_TRANSITIONS.SUBMIT.from.includes(profile.status) && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-lg font-semibold">Enviar para análise</h2>
          <p className="mb-3 text-sm text-slate-600">Salve o perfil e envie todos os documentos antes de enviar.</p>
          <SubmitForReviewForm />
        </section>
      )}

      {profile.statusHistory.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-lg font-semibold">Histórico do cadastro</h2>
          <ol className="space-y-2 text-sm">
            {profile.statusHistory.map((h) => (
              <li key={h.id}>
                <time dateTime={h.createdAt.toISOString()} className="text-slate-500">
                  {h.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </time>{" "}
                · {PROVIDER_STATUS_LABELS[h.fromStatus]} → <strong>{PROVIDER_STATUS_LABELS[h.toStatus]}</strong>
                {h.reason && <span className="block text-slate-600">Motivo: {h.reason}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {profile.status !== "DEACTIVATED" && (
        <section className="rounded-xl border border-red-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold text-red-900">Desativar cadastro</h2>
          <DeactivateForm />
        </section>
      )}
    </div>
  );
}
