# Catálogo, serviços e busca (Fase 6)

## Catálogo inicial

Definido com o Rodrigo em 2026-10-09 (`src/server/catalog-seed.ts`, aplicado com `npm run db:seed`):

- **Categorias:** Pintura, Limpeza, Faxina, Higienização, Jardinagem, Paisagismo, Impermeabilização, Marido de aluguel, Montagem de móveis.
- **Cidades (SC):** Imbituba e Garopaba, mais Paulo Lopes, Laguna e Imaruí como "arredores" sugeridos. O admin ativa, desativa ou cadastra outras em **Administração → Categorias e cidades**.

O seed só cria o que falta e nunca sobrescreve mudanças do admin. Categorias aceitam um nível de subcategoria. O endereço (slug) de uma categoria não muda quando ela é renomeada, para não quebrar links indexados.

## Regras dos serviços

- Só prestador com cadastro **aprovado** cadastra, edita, publica ou pausa serviços. A autorização é conferida no servidor antes de validar o formulário.
- Serviço novo nasce como **rascunho**; aparece na busca só depois de publicado.
- Preço fixo exige valor maior que zero (até R$ 1 milhão) e unidade (por serviço, por hora, por m²). "Sob orçamento" não guarda preço. O banco também impõe essas regras (restrições `CHECK`).
- Pelo menos uma cidade atendida; categoria e cidades precisam estar ativas.
- Um serviço aparece publicamente somente se: está publicado, o prestador está aprovado, a categoria está ativa e, se for subcategoria, a categoria principal também. Suspender o prestador ou desativar a categoria tira o serviço do ar na hora, sem apagar nada.
- Serviço de outro prestador é tratado como inexistente.
- Moderação (`MODERATE_SERVICES`) remove um serviço com motivo obrigatório, visível para o prestador. Serviço removido não pode ser editado nem republicado. Tudo fica na auditoria.
- A página pública mostra só o nome profissional, a cidade, a descrição e o selo do prestador. Nome civil, documentos e contato nunca aparecem.

## Como a busca ordena

1. Prestadores com **selo de documentos verificados vigente** primeiro.
2. Depois, os serviços **publicados mais recentemente**.

Ainda não há avaliações, histórico de contratações nem anúncios pagos, então nada disso influencia a ordem. Isso está explicado também na própria página de busca.

O texto buscado é comparado sem acentos e sem diferenciar maiúsculas com o título e a descrição do serviço, o nome da categoria (e da categoria principal) e o nome profissional do prestador. Todas as palavras precisam aparecer. O filtro de preço máximo considera só serviços com preço fixo.

## SEO

- `/servicos/[slug]`: título com cidades atendidas, descrição, link canônico e dados estruturados `Service` (schema.org).
- `/categorias/[slug]`: categoria sem serviços publicados recebe `noindex`.
- `/sitemap.xml`: página inicial, busca, categorias com serviços e serviços publicados.
- `/robots.txt`: bloqueia admin, conta, área do prestador, documentos, login e cadastro.
- Links absolutos usam `SITE_URL` (definir com o domínio real em produção).

## Ainda não incluído

- Fotos dos serviços: dependem de armazenamento público de imagens, separado do armazenamento privado de documentos.
- Contratação e pagamento pela plataforma (Fase 7 em diante). A página do serviço avisa que isso ainda não está disponível.
