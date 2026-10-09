import type { NextConfig } from "next";

// cacheComponents/partialPrefetching (padrão do template) ficam desligados por enquanto:
// quase todas as telas desta etapa dependem da sessão e são dinâmicas.
// Reavaliar quando existirem páginas públicas de catálogo (Fase 6).
const nextConfig: NextConfig = {
  poweredByHeader: false,
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
