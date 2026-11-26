import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // A importação do Trello manda o board inteiro numa ação (até 500 cartões com histórico).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Cabeçalhos de segurança (OWASP): o site não abre dentro de iframe de outro site, o navegador
  // não "adivinha" tipo de arquivo, e câmera, microfone e localização ficam desligados.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
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
