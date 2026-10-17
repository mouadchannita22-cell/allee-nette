/**
 * Pages légales (/mentions-legales, /cgv, /confidentialite) : les réglages
 * qui se modifient sans toucher aux textes. Les textes eux-mêmes sont dans
 * src/content/*.mdx ; les valeurs (associés, prix, délais…) y sont injectées
 * depuis config/site.ts et data/*.ts, jamais recopiées.
 */

/**
 * Date de dernière mise à jour de chaque page, au format AAAA-MM-JJ.
 * À changer à la main à chaque modification du texte (jamais la date du jour
 * calculée au rendu : la date affichée doit être celle du texte).
 */
export const MISES_A_JOUR = {
  mentionsLegales: "2026-10-17",
  cgv: "2026-10-17",
  confidentialite: "2026-10-17",
} as const;

/**
 * Ces textes sont des projets. Tant que `faite` vaut false, chaque page
 * affiche en tête « [À CONFIRMER : …] » : passez-la à true une fois les
 * textes relus par un professionnel du droit.
 */
export const RELECTURE_JURIDIQUE = {
  faite: false,
  libelle: "texte à faire relire par un professionnel du droit avant l'ouverture du site",
} as const;
