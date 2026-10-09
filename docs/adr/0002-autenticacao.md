# ADR 0002 — Autenticação própria com sessões no banco

Data: 2026-10-09 · Status: aceita, revisável

## Contexto
O plano previa login pelo Supabase Auth. Ainda não há conta Supabase criada, e a autorização da plataforma
(papéis + permissões administrativas finas + dono do registro) precisa ficar centralizada no servidor de qualquer forma.

## Decisão
Autenticação implementada no próprio app, sem dependências externas:
- Senhas com scrypt (Node `crypto`), parâmetros gravados junto ao hash para permitir aumento de custo.
- Sessão = token aleatório de 32 bytes em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção; no banco fica só o SHA-256 do token.
- Sessão validada no banco a cada requisição; logout apaga o registro.
- Papéis (`CLIENT`, `PROVIDER`, `ADMIN`) e permissões administrativas em tabelas; ADMIN só por script auditado.

## Consequências
- Funciona igual em desenvolvimento local e no Postgres do Supabase.
- Pendências antes de produção: limite de tentativas de login, recuperação de senha (depende de e-mail transacional),
  verificação de e-mail e, se desejado, login com Google. Migrar para Supabase Auth continua possível.
