# Conecta+ — Fase 1: Diagnóstico e Planejamento

Versão 1 · 2026-10-09 · Status: **aguardando aprovação do Rodrigo**

Nada foi instalado, criado ou configurado. Este documento cumpre a seção 26 da especificação.

---

## 1. Diagnóstico do ambiente atual

| Item | Situação encontrada |
|---|---|
| Código do Conecta+ | **Não existe.** Nenhum arquivo, diretório ou repositório do projeto. |
| Repositórios GitHub acessíveis | Apenas `ayaproject/certipass` (não relacionado). Nenhum repositório do Conecta+. |
| Banco de dados | **Nenhum configurado.** O ambiente de trabalho tem `psql` e `docker` disponíveis, mas sem banco nem credenciais. |
| Integrações (pagamento, e-mail, mapas, IA) | **Nenhuma.** Não há chaves, contas ou contratos. |
| Autenticação / autorização | Inexistente. |
| Testes | Inexistentes. |
| Ferramentas disponíveis | Node 22, Python 3.13, git, Docker. |
| Pasta no computador do Rodrigo | Nenhuma pasta conectada a esta conversa. |

**Conclusão:** projeto vazio (greenfield). Não há estrutura a preservar. A arquitetura abaixo é uma proposta nova.

---

## 2. Decisões já definidas na especificação

- Marketplace de serviços com três perfis: cliente, prestador, administrador.
- Prestador só publica após aprovação administrativa; cadastro com estados e transições definidas.
- Selo de verificação documental, separado de reputação, com histórico e validade.
- Categorias dinâmicas, gerenciadas pelo admin (nada fixo no código).
- Dois modelos de contratação: preço definido e orçamento com proposta versionada.
- Pagamento antecipado, via provedor de marketplace; nunca confirmar pagamento pelo navegador.
- Comissão inicial de 20%, configurável e centralizada, gravada por contratação.
- Status operacional separado do status financeiro.
- Avaliações só de clientes com contratação concluída, uma por contratação.
- Auditoria de operações administrativas e financeiras; menor privilégio no admin.
- Busca tradicional + recomendação em linguagem natural, sem a IA inventar dados.
- LGPD, SEO com páginas reais, sem dados fictícios em produção.
- Ordem de fases da seção 24.

---

## 3. Decisões importantes em aberto

Marquei minha recomendação em cada uma. As de número 1 e 2 bloqueiam o início; as demais podem ser decididas até a fase indicada.

| # | Decisão | Opções | Recomendação | Necessária até |
|---|---|---|---|---|
| 1 | **Stack e hospedagem** | (a) Next.js + PostgreSQL gerenciado (Supabase) + Vercel; (b) Next.js + Postgres próprio em VPS; (c) backend separado (NestJS) + frontend | **(a)**: um só app TypeScript, custo inicial baixo/zero, Postgres real com PostGIS, armazenamento privado de documentos, crescimento sem reescrita | Fase 3 |
| 2 | **Onde fica o código** | Novo repositório `ayaproject/conecta-plus` no GitHub (privado) ou pasta no seu computador | **Repositório privado novo** no GitHub | Fase 3 |
| 3 | Provedor de pagamentos | Pagar.me, Asaas, Mercado Pago, Stripe Connect (Brasil), Iugu | Comparar formalmente na Fase 9 com base em split, subcontas de prestadores, Pix, taxas, prazos de repasse e exigências cadastrais. **Não decidir agora** | Fase 9 |
| 4 | Base da comissão | Sobre o valor bruto do serviço ou sobre o valor após taxas do provedor | Bruto (mais simples e transparente), taxa do provedor absorvida pela plataforma ou pelo prestador, a definir | Fase 9 |
| 5 | Política de liberação do repasse | Após confirmação do cliente; após X dias sem contestação; manual | Confirmação do cliente **ou** prazo automático sem contestação, limitado ao que o provedor permite | Fase 9 |
| 6 | Pessoa jurídica e termos | CNPJ da plataforma, termos de uso, política de privacidade, política de cancelamento | Validação jurídica antes de processar pagamentos reais | Fase 9 |
| 7 | Região e categorias piloto | Lançar em uma cidade/região (ex.: Imbituba e entorno) com poucas categorias | **Começar regional** (densidade de oferta importa mais que abrangência) | Fase 6 |
| 8 | Prestador pessoa física e/ou jurídica | PF, PJ (MEI/empresa), ambos | Ambos, com documentos diferentes por tipo | Fase 4 |
| 9 | Documentos exigidos para verificação | RG/CNH, CPF/CNPJ, comprovante de endereço, certificações por categoria | Mínimo legal + requisitos por categoria configuráveis | Fase 4 |
| 10 | Provedor de e-mail transacional | Resend, Amazon SES, Postmark | Resend ou SES (decidir na Fase 12; notificações internas antes) | Fase 12 |
| 11 | Geolocalização | Só cidade/bairro (lista IBGE) ou geocodificação com raio (Google, Mapbox, OpenStreetMap) | Começar com cidade + bairro (IBGE, sem custo); raio com PostGIS quando houver CEP/endereço geocodificado | Fase 6 |
| 12 | Provedor de IA | API Claude (Anthropic) ou outro | Claude apenas para **interpretar** o pedido em filtros; a classificação é feita em SQL sobre dados reais | Fase 11 |

---

## 4. Arquitetura proposta (opção 1a)

```
Navegador ──► Next.js (Vercel)
               ├─ Páginas públicas (SSR/SSG para SEO)
               ├─ Áreas: cliente / prestador / admin
               ├─ Server Actions + rotas de API (validação com Zod)
               ├─ Camada de domínio (regras, máquinas de estado, comissão)
               ├─ Autorização centralizada (papel + propriedade do registro)
               └─ Webhooks de pagamento (assinatura verificada, idempotentes)
                        │
                        ▼
               PostgreSQL (Supabase) + PostGIS
               Storage privado (documentos) / público (fotos de portfólio)
               Auth (e-mail+senha, Google), sessões no servidor
```

Princípios:

- **Monólito modular** em TypeScript. Um repositório, um deploy. Módulos: `identidade`, `prestadores`, `catalogo`, `busca`, `contratacoes`, `propostas`, `mensagens`, `financeiro`, `avaliacoes`, `admin`, `auditoria`, `notificacoes`.
- **Autorização no servidor sempre.** Toda leitura e escrita passa por uma checagem central (papel + dono do registro). Row Level Security do Postgres como segunda camada, não como única.
- **Regras de negócio fora da interface.** Máquinas de estado (cadastro, contratação, financeiro) e cálculo de comissão ficam em código de domínio puro, testável sem banco.
- **Dinheiro em centavos (inteiros)**, nunca em ponto flutuante. Comissão gravada na contratação no momento do aceite (taxa + regra aplicada), para que mudanças futuras não alterem contratos passados.
- **Ledger financeiro append-only**: eventos financeiros são inseridos, nunca editados.
- **Mensagens sem tempo real** no início: atualização ao abrir/recarregar e notificação interna. Tempo real só se o uso justificar.
- **Dependências mínimas**: Next.js, Prisma (ORM e migrações), Zod (validação), Tailwind (estilo), Vitest + Playwright (testes). Nada além sem justificativa.
- **Ambientes**: local (Postgres em Docker com dados demonstrativos marcados), homologação e produção, cada um com suas variáveis.

Custos iniciais estimados: Vercel e Supabase têm planos gratuitos suficientes para desenvolvimento e piloto; plano pago (~US$ 25/mês no Supabase, ~US$ 20/mês na Vercel) quando houver tráfego real ou necessidade de backups/SLAs. Valores a confirmar no momento da contratação.

---

## 5. Modelo inicial de dados

Entidades agrupadas por módulo. Campos principais apenas; detalhes na Fase 2.

**Identidade**
- `users` (id, email único, nome, telefone, created_at, deleted_at)
- `user_roles` (user_id, role: `client` | `provider` | `admin`) — um usuário pode ser cliente e prestador
- `admin_permissions` (user_id, permission) — permissões finas: `approve_providers`, `manage_categories`, `finance_read`, `refunds`, `moderate_reviews`, `audit_read`…
- `client_profiles` (user_id, cidade, preferências)

**Prestadores**
- `provider_profiles` (id, user_id, tipo PF/PJ, nome/razão social, nome profissional, descrição, experiência, site, redes, link Google, status_cadastro, verified_badge_status)
- `provider_status_history` (provider_id, de, para, motivo, actor_id, at)
- `verification_documents` (provider_id, tipo, arquivo privado, status, revisado_por, revisado_em)
- `verification_reviews` (provider_id, critérios avaliados, resultado, admin_id, validade_até)
- `service_areas` (provider_id, cidade IBGE, bairro, raio_km, ponto geográfico opcional)
- `availability_rules` (provider_id, dia da semana, faixa horária)
- `portfolio_items` (provider_id, imagem, legenda)
- `payout_accounts` (provider_id, referência externa no provedor; **sem dados bancários completos se o provedor puder guardar**)

**Catálogo**
- `categories` (id, parent_id, nome, slug único, ativa, ordem) — subcategoria = categoria com pai
- `services` (id, provider_id, category_id, nome, slug, descrição, modalidade `fixed_price` | `quote`, preço_centavos, duração, condições, requisitos, status_publicação)
- `service_options` (service_id, nome, acréscimo_centavos)
- `service_images`

**Contratação**
- `quote_requests` (id, client_id, provider_id, service_id?, descrição, local, prazo desejado, orçamento informado, status)
- `proposals` (id, quote_request_id, versão, preço_centavos, escopo, prazo, condições, validade, status) — **cada revisão é uma nova versão imutável**
- `bookings` (id, client_id, provider_id, origem: serviço ou proposta aceita, `proposal_id` + versão aceita, termos congelados, valor_bruto, taxa_comissão_aplicada, status_operacional)
- `booking_status_history` (booking_id, de, para, actor_id, motivo, at)

**Comunicação**
- `conversations` (vinculada a quote_request ou booking; participantes)
- `messages` (conversation_id, autor, texto, anexos, criada_em, sinalizada)

**Financeiro**
- `payments` (booking_id, provedor, id_externo único, valor, status, idempotency_key única)
- `payment_events` (webhooks recebidos: id_externo único, payload, assinatura válida, processado_em) — garante idempotência
- `ledger_entries` (booking_id, tipo: bruto, comissão, taxa_provedor, líquido_prestador, reembolso, estorno; valor; referência externa) — append-only
- `payouts` (provider_id, booking_id, valor previsto, valor efetivo, status, referência externa)
- `refunds` (booking_id, valor, motivo, aprovado_por, status)
- `commission_rules` (id, percentual, base, vigente_de, vigente_até) — fonte única da taxa de 20%

**Confiança e suporte**
- `reviews` (booking_id **único**, client_id, provider_id, nota 1–5, comentário, status de moderação, resposta do prestador)
- `reports` (alvo, tipo, motivo, autor, status)
- `disputes` (booking_id, aberta_por, motivo, status, decisão, decidido_por)
- `support_tickets`

**Sistema**
- `notifications` (user_id, tipo, dados, lida_em)
- `audit_logs` (actor_id, ação, entidade, entity_id, antes/depois resumidos sem dados sensíveis, ip, at) — append-only

Regras de integridade chave: avaliação única por contratação (constraint), pagamento único por `idempotency_key`, evento de webhook único por id externo, valores em centavos `CHECK >= 0`, transições de estado validadas no domínio **e** registradas em histórico, índices em slug, cidade, categoria, status e busca textual (`tsvector` em português).

---

## 6. Máquinas de estado (rascunho)

**Cadastro do prestador**
`rascunho → em_analise → (aprovado | aguardando_correcoes | rejeitado)`; `aguardando_correcoes → em_analise`; `aprovado → suspenso → aprovado`; qualquer → `desativado` (pelo próprio ou admin). Alteração de dado sensível em `aprovado` gera nova análise sem tirar do ar o que não mudou (a definir caso a caso).
Obs.: "Pendente de envio" da especificação fica coberto por `rascunho` com checklist incompleto; posso manter como estado separado se preferir.

**Contratação (operacional)**
Preço fixo: `aguardando_pagamento → agendada → em_andamento → concluida_pelo_prestador → concluida` (confirmação do cliente ou prazo).
Orçamento: `solicitada → proposta_enviada ⇄ em_negociacao → aceita → aguardando_pagamento → …`.
De vários estados: `cancelada`, `em_disputa`.

**Financeiro (separado)**
`pendente → autorizado/pago → (retido) → repasse_liberado → repassado`; ramos `reembolso_solicitado → reembolsado (parcial|integral)`, `estornado`, `em_disputa`.

Cada transição terá: quem pode executar, pré-condições e registro em histórico/auditoria.

---

## 7. Roadmap incremental

| Fase | Entrega verificável | Depende de |
|---|---|---|
| 2. Arquitetura e dados | Documento de arquitetura (ADRs), schema Prisma inicial, migrações rodando em Postgres local, testes das máquinas de estado | Decisões 1 e 2 |
| 3. Fundação e autenticação | Repo, CI (lint + testes), cadastro/login, papéis, middleware de autorização, auditoria básica, testes de autorização | Fase 2 |
| 4. Cadastro de prestadores | Wizard por etapas, upload privado de documentos, estados do cadastro | Decisões 8 e 9 |
| 5. Painel admin | Fila de análise, aprovar/rejeitar/pedir correção, selo, permissões finas, logs | Fase 4 |
| 6. Categorias, serviços e busca | CRUD de categorias, publicação de serviços (só aprovados), busca com filtros reais, páginas públicas | Decisões 7 e 11 |
| 7. Contratação e orçamentos | Fluxo de preço fixo até "aguardando pagamento"; pedidos de orçamento | Fase 6 |
| 8. Propostas e mensagens | Propostas versionadas, aceite, conversas privadas | Fase 7 |
| 9. Pagamentos | Provedor escolhido e validado, sandbox, webhooks idempotentes, ledger, comissão, repasses | Decisões 3–6 |
| 10. Conclusão e avaliações | Confirmação, avaliações elegíveis, moderação | Fase 9 |
| 11. Recomendação inteligente | Interpretação em linguagem natural → filtros; ranking explicável | Dados reais suficientes; decisão 12 |
| 12. Notificações e SEO | E-mail transacional, sitemap, dados estruturados | Decisão 10 |
| 13. Produção | Revisão de segurança, testes de regressão, LGPD, backups, monitoramento | Tudo acima |

Até a Fase 9, pagamentos **não existem** no sistema: o fluxo para em "aguardando pagamento", sem simular cobrança.

---

## 8. Riscos

**Técnicos**
- Autorização mal aplicada expondo documentos e conversas → checagem central + testes de autorização obrigatórios em cada fase.
- Duplicidade de cobrança / webhook falso → idempotência, verificação de assinatura, confirmação consultando o provedor.
- Escopo grande demais → fases pequenas, cada uma com critérios de aceitação.

**Operacionais**
- Marketplace vazio (poucos prestadores) inviabiliza busca e recomendações → lançamento regional com captação ativa de prestadores antes de abrir para clientes.
- Fila de aprovação manual vira gargalo → critérios objetivos e checklist no painel.
- Contato fora da plataforma (desintermediação) → valor percebido (garantia de pagamento, reputação), sem bloquear de forma abusiva.

**Financeiros e jurídicos**
- Reter dinheiro de terceiros sem autorização pode caracterizar atividade regulada → usar split/subcontas do provedor; **não** receber em conta própria para repassar.
- Responsabilidade civil e consumerista do intermediador, nota fiscal da comissão, tributação → validação contábil e jurídica antes da Fase 9.
- Chargebacks e disputas → política clara, prazos alinhados ao provedor.
- LGPD: documentos pessoais são dados sensíveis na prática → armazenamento privado, acesso registrado, retenção definida.

---

## 9. Primeira unidade funcional recomendada

**"Conta com papéis e cadastro de prestador até a aprovação administrativa"** (fatia vertical das Fases 2 a 5, sem pagamentos, sem busca):

1. Pessoa cria conta e escolhe ser cliente e/ou prestador.
2. Prestador preenche perfil básico e envia para análise.
3. Admin vê a fila, aprova, rejeita ou pede correção, com registro de auditoria.
4. Prestador vê o status atualizado.

Critérios de aceitação:
- Prestador não aprovado não consegue publicar serviço (teste automatizado).
- Usuário sem permissão `approve_providers` não acessa a fila (teste automatizado).
- Toda mudança de status gera histórico e auditoria com o administrador responsável.
- Transição inválida (ex.: `rascunho → aprovado`) é recusada pelo servidor.

Motivo: é a base de todas as outras funcionalidades (identidade, autorização, máquina de estado, auditoria) e não depende de nenhuma integração externa.

---

## 10. O que preciso para começar a Fase 2

1. Aprovar (ou ajustar) a stack da decisão 1.
2. Autorizar a criação do repositório privado `ayaproject/conecta-plus` no seu GitHub.
3. Até a Fase 3 entrar em homologação: criar contas no Supabase e na Vercel em seu nome (eu não crio contas nem invento credenciais). Até lá, desenvolvo com Postgres local em Docker.

Nada será instalado nem criado antes da sua aprovação.
