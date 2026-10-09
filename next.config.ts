import type { NextConfig } from "next";

// cacheComponents/partialPrefetching (padrão do template) ficam desligados por enquanto:
// quase todas as telas desta etapa dependem da sessão e são dinâmicas.
// As páginas públicas do catálogo (Fase 6) também ficam dinâmicas: o cabeçalho lê a sessão e
// a busca depende dos filtros. Cache fica para quando houver volume que justifique.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Documentos de verificação têm até 8 MB (src/domain/file-validation.ts) + margem do multipart.
    serverActions: { bodySizeLimit: "9mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
