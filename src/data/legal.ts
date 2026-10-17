import { GARANTIE } from "./offres";

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

/** Attribution des contours de la carte des zones : sous la carte et dans les mentions légales. */
export const CREDIT_CARTE = "Contours des communes : IGN Admin Express, Licence Ouverte 2.0.";

// ---------------------------------------------------------------------------
// Conditions générales de vente (/cgv)
// ---------------------------------------------------------------------------

/**
 * Articles des CGV, dans l'ordre : le sommaire, la numérotation et les ancres
 * (/cgv#droit-de-retractation) en découlent. Dans src/content/cgv.mdx, chaque
 * article commence par `<Article id="…" />`. Un test vérifie que les deux
 * listes restent identiques.
 */
export const ARTICLES_CGV = [
  { id: "objet", titre: "Objet" },
  { id: "prestations-et-prix", titre: "Prestations et prix" },
  { id: "prix-ferme-sur-photos", titre: "Un prix ferme, confirmé sur photos" },
  { id: "supplements", titre: "Suppléments : toujours acceptés avant le rendez-vous" },
  { id: "conditions-d-intervention", titre: "Conditions d'intervention" },
  { id: "zones-et-deplacement", titre: "Zones et déplacement" },
  { id: "reservation-report-annulation", titre: "Réservation, report et annulation" },
  { id: "reservation-a-distance", titre: "Une réservation toujours à distance" },
  { id: "paiement", titre: "Paiement" },
  { id: "droit-de-retractation", titre: "Droit de rétractation" },
  { id: "garantie-retouche", titre: GARANTIE.nom },
  { id: "responsabilite-et-assurance", titre: "Responsabilité et assurance" },
  { id: "reclamations-et-mediation", titre: "Réclamations et médiation" },
  { id: "donnees-personnelles", titre: "Données personnelles" },
  { id: "droit-applicable", titre: "Droit applicable et litiges" },
] as const satisfies readonly { id: string; titre: string }[];

export type IdArticleCgv = (typeof ARTICLES_CGV)[number]["id"];

/** Annexe des CGV : le formulaire type de rétractation. */
export const ANNEXE_CGV = { id: "formulaire-de-retractation", titre: "Formulaire type de rétractation" } as const;

/** Délai légal de rétractation d'un contrat conclu à distance, en jours. */
export const DELAI_RETRACTATION_JOURS = 14;

/** Délai maximal de remboursement après une rétractation, en jours. */
export const DELAI_REMBOURSEMENT_JOURS = 14;
