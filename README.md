# Conecta+

Plataforma de contratação de serviços que conecta clientes a prestadores analisados pela equipe.

> Estado atual: **primeira entrega** (contas, papéis e aprovação de prestadores).
> Busca, catálogo, contratações e pagamentos ainda **não existem**. Veja [docs/status.md](docs/status.md).

## Stack

Next.js 16 (App Router, TypeScript) · PostgreSQL · Prisma 6 · Zod · Tailwind 4 · Vitest · Playwright.
Hospedagem prevista: Vercel (app) e Supabase (Postgres e armazenamento de arquivos). Ver [ADR 0001](docs/adr/0001-stack.md).

## Rodando localmente

Pré-requisitos: Node 22+ e PostgreSQL 16 (instalado ou via Docker).

```bash
# Postgres via Docker (opcional)
docker run -d --name conecta-pg -e POSTGRES_USER=conecta -e POSTGRES_PASSWORD=conecta_dev -p 5432:5432 postgres:16
docker exec conecta-pg createdb -U conecta conecta_test
docker exec conecta-pg createdb -U conecta conecta_e2e_test

cp .env.example .env        # ajuste DATABASE_URL
npm install
npm run db:migrate          # aplica as migrações no banco de desenvolvimento
npm run dev                 # http://localhost:3000
```

### Primeiro administrador

Não existe cadastro público de administrador. Crie a conta pelo site e conceda as permissões pela linha de comando
(fica registrado na auditoria):

```bash
npm run admin:grant -- voce@exemplo.com APPROVE_PROVIDERS SUSPEND_PROVIDERS
```

Permissões disponíveis: `APPROVE_PROVIDERS`, `SUSPEND_PROVIDERS`, `READ_AUDIT_LOG`, `MANAGE_ADMINS`.

## Testes

```bash
npm run lint
npm run typecheck
npm run test:unit          # regras de negócio puras
npm run test:integration   # serviços contra o banco conecta_test (TEST_DATABASE_URL)
npm run test:e2e           # fluxo completo no navegador (desktop e celular), banco conecta_e2e_test
```

## Estrutura

```
src/domain/          regras puras (máquina de estados, permissões, validação de perfil)
src/server/          acesso a dados e regras com banco (somente servidor)
  auth/              senhas (scrypt), tokens e sessão em cookie
  services/          contas, prestadores, administradores
src/app/             páginas e server actions (camada fina sobre os serviços)
prisma/              schema e migrações versionadas
tests/               unit, integration, e2e
docs/                plano, decisões de arquitetura e status
```

## Documentação

- [Diagnóstico e plano (Fase 1)](docs/01-diagnostico-e-plano.md)
- [Status e pendências](docs/status.md)
- [Regras de negócio implementadas](docs/regras-cadastro-prestador.md)
- [Decisões de arquitetura](docs/adr/)
