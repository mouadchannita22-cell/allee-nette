/**
 * Paiement en ligne par lien signé (partie 10 du brief) : les règles qui se
 * modifient sans toucher au code. Source unique pour le serveur (signature,
 * vérification), pour la page d'administration et pour la page /paiement.
 */
import type { PAIEMENT_SUR_PLACE } from "./conditions";

/** Montants acceptés pour un lien de paiement, en euros (bornes comprises). */
export const BORNES_MONTANT = { minEuros: 15, maxEuros: 600 } as const;

/** Durée de validité d'un lien de paiement, en jours. */
export const VALIDITE_LIEN_JOURS = 7;

/** Longueur maximale du libellé de la prestation (« Le Complet M »), en caractères. */
export const LIBELLE_MAX = 80;

/** Chemin de la page de paiement, cible des liens signés. */
export const CHEMIN_PAIEMENT = "/paiement";

// ---------------------------------------------------------------------------
// Page /paiement
// ---------------------------------------------------------------------------

/** Texte de réassurance sous le bouton de paiement (partie 10.3 du brief). */
export const REASSURANCE_PAIEMENT =
  "Paiement sécurisé par Stripe. Nous ne voyons ni ne conservons vos données bancaires.";

/**
 * Moyens de paiement en ligne, dans l'ordre d'affichage. Les logos officiels
 * se déposent dans public/paiement/logos/ sous le nom « <id>.svg » (ou .png,
 * .webp) : voir public/paiement/logos/LISEZMOI.md. Sans fichier, la page
 * affiche le libellé en texte. Un logo n'est jamais redessiné.
 */
export const LOGOS_PAIEMENT = [
  { id: "cb", libelle: "CB" },
  { id: "visa", libelle: "Visa" },
  { id: "mastercard", libelle: "Mastercard" },
  { id: "apple-pay", libelle: "Apple Pay" },
  { id: "google-pay", libelle: "Google Pay" },
  { id: "paypal", libelle: "PayPal" },
] as const;

/** Dossier public des logos officiels (public/paiement/logos/). */
export const DOSSIER_LOGOS_PAIEMENT = "/paiement/logos";

/** Formats acceptés pour un logo officiel, par ordre de préférence. */
export const FORMATS_LOGO = ["svg", "png", "webp"] as const;

/** Détail de chaque moyen de paiement sur place (PAIEMENT_SUR_PLACE, data/conditions.ts). */
export const DETAILS_PAIEMENT_SUR_PLACE: Record<(typeof PAIEMENT_SUR_PLACE)[number], string> = {
  Carte: "Carte bancaire, sur notre terminal mobile",
  "Sans contact": "Sans contact : carte, Apple Pay ou Google Pay, sur le même terminal",
  PayPal: "PayPal, en scannant notre QR code",
  Espèces: "Espèces, contre facture",
};

export const FACTURE_SUR_PLACE = "Votre facture vous est remise sur place ou envoyée par e-mail.";

/** Situation du lien reçu par la page /paiement : absent, ou raison du refus. */
export type SituationLien = "absent" | "format" | "signature" | "expire" | "montant" | "configuration";

/** Messages de la page /paiement quand aucun paiement n'est proposé. */
export const MESSAGES_LIEN: Record<SituationLien, { titre: string; texte: string }> = {
  absent: {
    titre: "Vous avez reçu un lien de paiement ?",
    texte:
      "Vous avez reçu un lien de paiement par message (WhatsApp ou SMS) : ouvrez-le directement depuis ce message. Il contient votre référence et le montant. Pas encore de lien ? Écrivez-nous, nous vous l'envoyons une fois le prix confirmé.",
  },
  format: {
    titre: "Ce lien de paiement est incomplet",
    texte:
      "Il a peut-être été coupé ou mal copié. Par sécurité, aucun paiement n'est possible avec ce lien. Ouvrez-le à nouveau depuis notre message, ou demandez-nous un nouveau lien.",
  },
  signature: {
    titre: "Ce lien de paiement n'est pas valide",
    texte:
      "Il ne correspond pas au lien que nous avons envoyé : il a peut-être été modifié. Par sécurité, le paiement est refusé. Demandez-nous un nouveau lien.",
  },
  expire: {
    titre: "Ce lien de paiement a expiré",
    texte: `Nos liens de paiement restent valables ${VALIDITE_LIEN_JOURS} jours. Demandez-nous un nouveau lien : nous vous le renvoyons rapidement.`,
  },
  montant: {
    titre: "Ce montant ne peut pas être réglé en ligne",
    texte: `Le paiement en ligne accepte les montants de ${BORNES_MONTANT.minEuros} € à ${BORNES_MONTANT.maxEuros} €. Contactez-nous : nous trouvons la bonne solution ensemble, ou vous réglez sur place.`,
  },
  configuration: {
    titre: "Paiement en ligne momentanément indisponible",
    texte: "Notre page de paiement est en cours de réglage. Contactez-nous, ou réglez sur place après la prestation.",
  },
};

/** Remplace le bouton de paiement quand la clé Stripe de l'encaisseur manque. */
export const PAIEMENT_BIENTOT_DISPONIBLE = "Paiement en ligne bientôt disponible";

/** Bandeau affiché avec une clé Stripe de test. */
export const MENTION_MODE_TEST = "Mode test : aucun débit réel.";

// ---------------------------------------------------------------------------
// Après le paiement (/paiement/merci)
// ---------------------------------------------------------------------------

/** Rappels de la page de remerciement. */
export const RAPPELS_APRES_PAIEMENT = [
  "Nous vous confirmons l'heure du rendez-vous par message.",
  "Votre facture suit par e-mail.",
] as const;
