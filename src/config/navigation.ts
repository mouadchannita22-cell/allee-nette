import { site } from "@/config/site";
import type { Formule } from "@/data/offres";

export type Lien = { href: string; libelle: string; description?: string };

/** Page détaillée d'une formule, ou la grille des tarifs si sa page n'est pas encore ouverte. */
export function lienFormule(f: Formule): string {
  if (f.page === "/pret-a-vendre-ou-a-rendre" && !site.pages.pretAVendre) return "/tarifs#grille";
  return f.page;
}

/** Pages de prestations, selon les pages ouvertes dans `config/site.ts`. */
export const prestations: readonly Lien[] = [
  {
    href: "/nettoyage-interieur-voiture-domicile",
    libelle: "Nettoyage intérieur",
    description: "L'Intérieur Net et Le Grand Soin, chez vous",
  },
  {
    href: "/lavage-exterieur-sans-rincage",
    libelle: "Lavage extérieur sans rinçage",
    description: "Le Complet : dedans comme dehors, aucun rejet d'eau",
  },
  ...(site.pages.pretAVendre
    ? [
        {
          href: "/pret-a-vendre-ou-a-rendre",
          libelle: "Prêt à vendre ou à rendre",
          description: "Vente ou restitution de location, photos d'annonce",
        },
      ]
    : []),
  ...(site.pages.professionnels
    ? [
        {
          href: "/professionnels",
          libelle: "Professionnels",
          description: "Pack Utilitaires Artisan, sur devis",
        },
      ]
    : []),
];

export const navigationPrincipale: readonly Lien[] = [
  { href: "/tarifs", libelle: "Tarifs" },
  { href: "/zones", libelle: "Zones" },
  { href: "/faq", libelle: "FAQ" },
];

export const liensLegaux: readonly Lien[] = [
  { href: "/mentions-legales", libelle: "Mentions légales" },
  { href: "/cgv", libelle: "CGV" },
  { href: "/confidentialite", libelle: "Confidentialité" },
];

export const liensInfos: readonly Lien[] = [
  { href: "/tarifs", libelle: "Tarifs et formules" },
  { href: "/zones", libelle: "Zones d'intervention" },
  { href: "/faq", libelle: "Questions fréquentes" },
  { href: "/a-propos", libelle: "Qui sommes-nous" },
  ...(site.pages.bonsCadeaux ? [{ href: "/bons-cadeaux", libelle: "Bons cadeaux" }] : []),
];
