import type { NextConfig } from "next";

// cacheComponents/partialPrefetching (padrão do template) ficam desligados por enquanto:
// quase todas as telas desta etapa dependem da sessão e são dinâmicas.
// Reavaliar quando existirem páginas públicas de catálogo (Fase 6).
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
