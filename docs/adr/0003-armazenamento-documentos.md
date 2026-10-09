# ADR 0003 — Armazenamento privado de documentos

Data: 2026-10-09 · Status: aceita, com pendência de produção

## Contexto
Documentos de verificação (RG, CNH, CNPJ, contrato social) são dados pessoais sensíveis na prática.
Não podem ficar em pasta pública nem em URL adivinhável.

## Decisão
- Os arquivos ficam atrás da interface `FileStorage` (`src/server/storage.ts`). No banco ficam só metadados e o SHA-256.
- O tipo do arquivo é detectado pelo conteúdo (PDF, JPG, PNG), até 8 MB. O nome enviado é só exibição.
- A chave de armazenamento é aleatória (`docs/<prestador>/<uuid>.<ext>`).
- O arquivo só é entregue pela rota `/documentos/[id]`, ao dono ou a administradores com `VERIFY_DOCUMENTS` ou
  `APPROVE_PROVIDERS`. Para os demais a resposta é 404 (não revela se existe). Toda leitura gera auditoria.
- Driver atual: pasta local privada (`STORAGE_LOCAL_DIR`), para desenvolvimento e testes.

## Pendência
Em produção (Vercel) o disco é temporário. O app **recusa** o driver local em produção. Antes de publicar é preciso
criar um bucket privado no Supabase Storage e implementar o driver correspondente (mesma interface).
