import { readdirSync } from "node:fs";
import createMDX from "@next/mdx";
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

/**
 * Pages de paiement (/paiement, /paiement/merci) : leur adresse contient la
 * signature du lien et la référence. Jamais mises en cache, jamais
 * transmises à un autre site par l'en-tête Referer. Posées après les en-têtes
 * communs : la dernière valeur d'un même en-tête l'emporte.
 */
const enTetesPaiement = [
  { key: "Cache-Control", value: "no-store" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/**
 * Logos officiels des moyens de paiement déposés dans public/paiement/logos/
 * (voir le LISEZMOI.md du dossier), relevés au build : le composant
 * LogosPaiement affiche un libellé texte pour chaque logo absent.
 */
function logosPaiementPresents(): string {
  try {
    return readdirSync("public/paiement/logos")
      .filter((fichier) => /^[a-z-]+\.(?:svg|png|webp)$/.test(fichier))
      .join(",");
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  env: {
    // Contexte Netlify (production, deploy-preview, branch-deploy, dev), fiable
    // seulement au build : recopié ici pour le serveur (lib/environnement.ts).
    // Jamais de secret dans cette liste : elle est inscrite dans le code compilé.
    CONTEXTE_DEPLOIEMENT: process.env.CONTEXT ?? "",
    LOGOS_PAIEMENT_PRESENTS: logosPaiementPresents(),
    // Identifiant public d'Umami, inscrit même vide : sans lui, le code de
    // mesure disparaît du JavaScript envoyé (components/layout/ScriptUmami.tsx).
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? "",
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
    return [
      { source: "/:chemin*", headers: enTetesSecurite },
      { source: "/paiement", headers: enTetesPaiement },
      { source: "/paiement/merci", headers: enTetesPaiement },
    ];
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

/**
 * MDX (@next/mdx) : les textes longs (mentions légales, CGV, confidentialité)
 * vivent dans src/content/*.mdx et sont importés par leur page. Les styles et
 * les composants communs sont dans src/mdx-components.tsx. Aucune extension
 * de Markdown : avec Turbopack, les options doivent rester sérialisables, et
 * les ancres des titres sont posées par mdx-components.tsx.
 */
const withMDX = createMDX({});

export default withMDX(nextConfig);
