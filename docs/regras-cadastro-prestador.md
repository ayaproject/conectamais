# Regras do cadastro de prestador

Fonte da verdade: `src/domain/provider-status.ts`.

| Ação | De | Para | Quem | Motivo obrigatório |
|---|---|---|---|---|
| Enviar para análise | Rascunho, Aguardando correções | Em análise | Prestador (perfil completo) | Não |
| Aprovar | Em análise | Aprovado | Admin com `APPROVE_PROVIDERS` | Não |
| Pedir correções | Em análise | Aguardando correções | Admin com `APPROVE_PROVIDERS` | Sim |
| Rejeitar | Em análise | Rejeitado | Admin com `APPROVE_PROVIDERS` | Sim |
| Suspender | Aprovado | Suspenso | Admin com `SUSPEND_PROVIDERS` | Sim |
| Reativar | Suspenso | Aprovado | Admin com `SUSPEND_PROVIDERS` | Não |
| Desativar | qualquer, exceto Desativado | Desativado | Prestador ou admin com `SUSPEND_PROVIDERS` | Não |

Outras regras:
- O perfil só é editável em Rascunho ou Aguardando correções.
- Somente Aprovado pode oferecer serviços (`canOfferServices`). Será aplicado na publicação de serviços (Fase 6).
- Um administrador não analisa o próprio cadastro.
- Toda transição grava histórico (`provider_status_history`) e auditoria (`audit_logs`) com o responsável.
- A transição só é aplicada se o status ainda for o lido: duas decisões simultâneas não se sobrepõem.
- Rejeitado e Desativado são finais nesta versão (reabertura é decisão de produto em aberto).
- "Pendente de envio" da especificação é representado por Rascunho com perfil incompleto.
