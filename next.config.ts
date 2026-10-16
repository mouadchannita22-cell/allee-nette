import type { NextConfig } from "next";

const enTetesSecurite = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  env: {
    // Contexte Netlify (production, deploy-preview, branch-deploy, dev), fiable
    // seulement au build : recopié ici pour le serveur (lib/environnement.ts).
    // Jamais de secret dans cette liste : elle est inscrite dans le code compilé.
    CONTEXTE_DEPLOIEMENT: process.env.CONTEXT ?? "",
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:chemin*", headers: enTetesSecurite }];
  },
  async redirects() {
    // URL courte du QR code du garage partenaire (partie 14 du brief).
    return [
      {
        source: "/garage",
        destination: "/reserver?code=GARAGE&utm_source=garage&utm_medium=qr",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
