# ADR 0001 — Stack e hospedagem

Data: 2026-10-09 · Status: aceita (aprovada pelo Rodrigo)

## Decisão
Monólito modular em Next.js + TypeScript, PostgreSQL com Prisma, hospedagem prevista na Vercel e no Supabase.

## Motivos
Um único app e um único deploy; custo inicial baixo; Postgres real (com PostGIS para busca por região no futuro);
armazenamento privado para documentos de verificação; crescimento sem reescrita.

## Consequências
- Regras de negócio ficam em `src/domain` e `src/server/services`, independentes do Next.js, para serem testadas sem navegador.
- `cacheComponents` do Next 16 está desligado nesta etapa porque todas as telas dependem da sessão. Reavaliar na Fase 6.
