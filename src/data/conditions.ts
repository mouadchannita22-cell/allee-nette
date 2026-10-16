/**
 * Conditions d'intervention et promesses chiffrées, utilisées dans tous les
 * textes du site (accueil, FAQ, fiches, réservation, CGV).
 */
export const CONDITIONS = {
  /** Distance maximale entre la voiture et la prise électrique. */
  priseElectriqueMetres: 20,
  /** Longueur de notre rallonge. */
  rallongeMetres: 25,
  /** Eau apportée pour un lavage extérieur sans rinçage, environ. */
  eauLitres: 10,
  /** Présence du client au début (état des lieux) et à la fin (contrôle). */
  presenceMinutes: 5,
  /** Délai de confirmation du prix ferme sur photos. */
  delaiPrixFermeHeures: 2,
  /** Délai de la garantie Retouche. */
  retoucheHeures: 24,
  /** Nombre de photos demandées à la réservation. */
  photosDemandees: 3,
} as const;

/** Emplacements où nous intervenons. Jamais sur la voie publique. */
export const EMPLACEMENTS = [
  "Votre allée",
  "Votre cour",
  "Votre garage ouvert",
  "Votre place de copropriété, avec l'accord écrit du syndic ou du règlement",
] as const;
