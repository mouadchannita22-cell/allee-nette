/**
 * Paiement en ligne par lien signé (partie 10 du brief) : les règles qui se
 * modifient sans toucher au code. Source unique pour le serveur (signature,
 * vérification) et pour la page d'administration.
 */

/** Montants acceptés pour un lien de paiement, en euros (bornes comprises). */
export const BORNES_MONTANT = { minEuros: 15, maxEuros: 600 } as const;

/** Durée de validité d'un lien de paiement, en jours. */
export const VALIDITE_LIEN_JOURS = 7;

/** Longueur maximale du libellé de la prestation (« Le Complet M »), en caractères. */
export const LIBELLE_MAX = 80;

/** Chemin de la page de paiement, cible des liens signés. */
export const CHEMIN_PAIEMENT = "/paiement";
