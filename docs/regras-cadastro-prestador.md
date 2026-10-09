# Regras do cadastro de prestador

Fonte da verdade: `src/domain/provider-status.ts`.

| Ação | De | Para | Quem | Motivo obrigatório |
|---|---|---|---|---|
| Enviar para análise | Rascunho, Aguardando correções | Em análise | Prestador (perfil completo e documentos enviados) | Não |
| Aprovar | Em análise | Aprovado | Admin com `APPROVE_PROVIDERS` (todos os documentos aceitos) | Não |
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

## Documentos de verificação

Fonte da verdade: `src/domain/verification.ts`. Definido pelo Rodrigo em 2026-10-09.

| Tipo de cadastro | Documentos exigidos |
|---|---|
| Pessoa física (CPF) | RG **ou** CNH |
| Pessoa jurídica (CNPJ) | Comprovante de inscrição no CNPJ; contrato social, requerimento de empresário ou CCMEI; RG **ou** CNH do dono ou responsável |

- Formatos: PDF, JPG ou PNG, até 8 MB (frente e verso no mesmo arquivo).
- Documentos só podem ser enviados com o cadastro em Rascunho ou Aguardando correções.
- Um novo envio para o mesmo item substitui o anterior (o anterior fica como "Substituído", não é apagado).
- O envio para análise exige todos os itens com documento não recusado.
- Admin com `VERIFY_DOCUMENTS` aceita ou recusa cada documento (recusa exige motivo), com o cadastro em análise.
- Aprovar o cadastro (`APPROVE_PROVIDERS`) exige todos os documentos exigidos aceitos.

## Selo de prestador verificado

- Concedido por admin com `VERIFY_DOCUMENTS`, só para prestador Aprovado com todos os documentos aceitos.
- Validade de 12 meses (`BADGE_VALIDITY_MONTHS`). Remoção exige motivo.
- Cada concessão ou remoção registra critérios (documentos considerados), responsável, data e validade.
- O selo só é exibido com o cadastro Aprovado e dentro da validade: suspensão ou desativação o tornam inativo.
- Significa apenas que os documentos foram conferidos; não é garantia de qualidade do serviço.
- Ninguém analisa ou verifica o próprio cadastro.
