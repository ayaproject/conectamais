# Status da implementação

Atualizado em 2026-10-09.

## Concluído e validado

| Item | Validação |
|---|---|
| Criação de conta (cliente; cliente + prestador) | testes de integração + e2e |
| Login/logout com sessão no banco | testes de integração + e2e |
| Perfil de prestador em rascunho, edição e envio para análise | testes de integração + e2e |
| Fila de análise e decisão do admin (aprovar, pedir correções, rejeitar, suspender, reativar, desativar) | testes de integração; aprovação também no e2e |
| Permissões administrativas finas e bloqueio de acesso | testes de integração + e2e (cliente redirecionado) |
| Histórico de status e auditoria | testes de integração |
| Proteção contra decisões simultâneas | teste de integração |
| Layout responsivo | e2e em viewport de celular (Pixel 7) |

## Ainda não implementado (próximas etapas)

- Upload de documentos de verificação e selo de verificado (Fase 4/5).
- Categorias, serviços e busca (Fase 6).
- Contratação, orçamentos, propostas, mensagens (Fases 7–8).
- Pagamentos, comissão e repasses (Fase 9) — depende da escolha do provedor e de validação jurídica.
- Avaliações, recomendações, notificações por e-mail, SEO (Fases 10–12).

## Pendências antes de produção

- Limite de tentativas de login e proteção contra automação.
- Recuperação de senha e verificação de e-mail (depende de provedor de e-mail).
- Política de privacidade e termos de uso.
- Contas Supabase e Vercel e variáveis de ambiente de produção.
- `npm audit` aponta vulnerabilidades em dependências de desenvolvimento do ESLint (`braces` via `eslint-config-next`); não afetam o app em execução. Acompanhar atualização.
