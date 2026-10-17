/**
 * Parcours de réservation (/reserver) : tout ce qui se règle sans toucher
 * au code, dans l'ordre des étapes (partie 9 du brief).
 *
 * Les prix et les options viennent de `data/offres.ts`, les conditions
 * d'intervention de `data/conditions.ts` : rien n'est recopié ici.
 */
import { CONDITIONS, EMPLACEMENTS, PAIEMENT_SUR_PLACE } from "./conditions";
import { DELAI_RETRACTATION_JOURS } from "./legal";
import { option, type OptionId } from "./offres";

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------

export const ETAPES_RESERVATION = [
  "Votre voiture",
  "Votre formule",
  "Le lieu",
  "Vos créneaux",
  "Vos coordonnées",
  "Photos et paiement",
  "Validation",
] as const;

/** Numéro d'étape, de 1 à 7. */
export type NumeroEtape = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Nombre de voitures par demande (la remise deux voitures s'applique dès la deuxième). */
export const MAX_VOITURES = 3;

// ---------------------------------------------------------------------------
// Étape 1 : votre voiture
// ---------------------------------------------------------------------------

export type EtatVehicule = "normal" | "sale" | "tres-sale";

/** État de la voiture. « Très sale » coche le supplément fixé sur photos. */
export const ETATS_VEHICULE: readonly { id: EtatVehicule; libelle: string; option?: OptionId }[] = [
  { id: "normal", libelle: "Normal" },
  { id: "sale", libelle: "Sale" },
  { id: "tres-sale", libelle: "Très sale (sable, boue, déchets)", option: "tres-sale" },
];

export type Animaux = "non" | "un-peu" | "beaucoup";

/** Poils d'animaux. Chaque réponse positive coche l'option correspondante. */
export const ANIMAUX: readonly { id: Animaux; libelle: string; option?: OptionId }[] = [
  { id: "non", libelle: "Non" },
  { id: "un-peu", libelle: "Un peu de poils", option: "poils-moderes" },
  { id: "beaucoup", libelle: "Beaucoup de poils", option: "poils-importants" },
];

/** Sièges enfants : de 0 à la quantité maximale de l'option « siège enfant ». */
export const SIEGES_ENFANT_MAX = option("siege-enfant").unite?.max ?? 3;

// ---------------------------------------------------------------------------
// Étape 3 : le lieu
// ---------------------------------------------------------------------------

export type TypeEmplacement = "allee" | "cour" | "garage" | "copropriete";

/** Messages conditionnels de la partie 9.2, mot pour mot. */
export const MESSAGE_COPROPRIETE =
  "Nous avons besoin de l'accord écrit du syndic ou du règlement de copropriété avant d'intervenir.";
export const MESSAGE_SANS_PRISE = `Nous avons besoin d'une prise à moins de ${CONDITIONS.priseElectriqueMetres} m. Écrivez-nous : nous verrons ensemble si c'est faisable.`;
// Extérieur demandé : MESSAGE_METEO, dans lib/prix.ts (déjà affiché par le calculateur).

/** Types d'emplacement, avec les libellés de `EMPLACEMENTS` (data/conditions.ts). */
export const TYPES_EMPLACEMENT: readonly { id: TypeEmplacement; libelle: string; message?: string }[] = [
  { id: "allee", libelle: EMPLACEMENTS[0] },
  { id: "cour", libelle: EMPLACEMENTS[1] },
  { id: "garage", libelle: EMPLACEMENTS[2] },
  { id: "copropriete", libelle: EMPLACEMENTS[3], message: MESSAGE_COPROPRIETE },
];

export type ReponsePrise = "oui" | "non" | "ne-sait-pas";

export const QUESTION_PRISE = `Une prise électrique à moins de ${CONDITIONS.priseElectriqueMetres} m de la voiture ?`;

/** Prise électrique. Sans prise, la demande reste possible : on en parle ensemble. */
export const REPONSES_PRISE: readonly { id: ReponsePrise; libelle: string; message?: string }[] = [
  { id: "oui", libelle: "Oui" },
  { id: "non", libelle: "Non", message: MESSAGE_SANS_PRISE },
  { id: "ne-sait-pas", libelle: "Je ne sais pas" },
];

// ---------------------------------------------------------------------------
// Étape 4 : vos créneaux
// ---------------------------------------------------------------------------

export type Moment = "matin" | "apres-midi";

export const MOMENTS: Record<Moment, string> = { matin: "matin", "apres-midi": "après-midi" };

/**
 * Créneaux proposés chaque semaine. `jour` suit la numérotation de JavaScript :
 * 0 = dimanche, 1 = lundi… 6 = samedi. Ajoutez ou retirez une ligne pour
 * changer les créneaux : les dates se calculent toutes seules.
 */
export const CRENEAUX_PROPOSES: readonly { jour: number; moment: Moment; libelle: string }[] = [
  { jour: 3, moment: "apres-midi", libelle: "Mercredi après-midi" },
  { jour: 6, moment: "matin", libelle: "Samedi matin" },
  { jour: 6, moment: "apres-midi", libelle: "Samedi après-midi" },
];

export const REGLES_CRENEAUX = {
  /** Jusqu'où l'on peut réserver, en semaines. */
  horizonSemaines: 4,
  /** Premier jour proposé : 1 = à partir du lendemain. */
  delaiMinimumJours: 1,
  /** Créneaux demandés, par ordre de préférence. */
  nombreDemandes: 3,
  /** Créneaux obligatoires. */
  minimum: 1,
} as const;

// ---------------------------------------------------------------------------
// Étape 5 : vos coordonnées
// ---------------------------------------------------------------------------

export type SourceConnaissance =
  | "google"
  | "garagiste"
  | "voisin"
  | "reseaux-sociaux"
  | "bouche-a-oreille"
  | "autre";

export const QUESTION_CONNAISSANCE = "Comment nous avez-vous connus ?";

export const SOURCES_CONNAISSANCE: readonly { id: SourceConnaissance; libelle: string }[] = [
  { id: "google", libelle: "Google" },
  { id: "garagiste", libelle: "Garagiste" },
  { id: "voisin", libelle: "Voisin" },
  { id: "reseaux-sociaux", libelle: "Réseaux sociaux" },
  { id: "bouche-a-oreille", libelle: "Bouche-à-oreille" },
  { id: "autre", libelle: "Autre" },
];

// ---------------------------------------------------------------------------
// Étape 6 : photos et paiement
// ---------------------------------------------------------------------------

export type PhotoId = "avant" | "arriere" | "exterieur";

/** Photos demandées, facultatives. `champ` : nom du fichier dans l'envoi au serveur. */
export const PHOTOS_DEMANDEES: readonly { id: PhotoId; champ: `photo-${PhotoId}`; libelle: string }[] = [
  { id: "avant", champ: "photo-avant", libelle: "Habitacle avant" },
  { id: "arriere", champ: "photo-arriere", libelle: "Habitacle arrière" },
  { id: "exterieur", champ: "photo-exterieur", libelle: "Extérieur" },
];

/**
 * Compression dans le navigateur, avant l'envoi : environ 1 600 px sur le
 * côté le plus long, moins de 500 Ko, en JPEG (les métadonnées, dont la
 * position GPS, disparaissent au réencodage).
 */
export const COMPRESSION_PHOTOS = {
  coteMaxPx: 1600,
  /** Cible donnée à la bibliothèque, un peu sous la limite. */
  cibleMo: 0.45,
  /** Limite vérifiée après compression. */
  poidsMaxOctets: 500 * 1024,
  qualiteInitiale: 0.8,
  type: "image/jpeg",
} as const;

export type ModePaiement = "en-ligne" | "sur-place";

/** Moyens de paiement en ligne, par le lien sécurisé envoyé après confirmation du prix. */
export const PAIEMENT_EN_LIGNE = ["Carte bancaire", "Apple Pay", "Google Pay", "PayPal"] as const;

export const MODES_PAIEMENT: readonly { id: ModePaiement; libelle: string; moyens: readonly string[] }[] = [
  { id: "en-ligne", libelle: "En ligne, après confirmation du prix", moyens: PAIEMENT_EN_LIGNE },
  { id: "sur-place", libelle: "Sur place, après la prestation", moyens: PAIEMENT_SUR_PLACE },
];

export const RAPPEL_PAIEMENT =
  "Rien à payer maintenant. Vous réglez seulement une fois le prix ferme confirmé : en ligne, ou sur place après la prestation.";

// ---------------------------------------------------------------------------
// Étape 7 : validation
// ---------------------------------------------------------------------------

/**
 * Texte exact de la partie 9.1, point 7. Cité tel quel dans l'article
 * « Droit de rétractation » des CGV (src/content/cgv.mdx) : une seule source.
 */
export const TEXTE_EXECUTION_ANTICIPEE = `Je demande que la prestation soit réalisée avant la fin du délai de rétractation de ${DELAI_RETRACTATION_JOURS} jours, et je reconnais perdre mon droit de rétractation une fois la prestation entièrement exécutée.`;

type Libelle = { avant: string; lien?: { href: string; texte: string }; apres?: string };

/** Cases de la validation : trois obligatoires, une facultative. Aucune n'est précochée. */
export const CASES_VALIDATION: Record<"cgv" | "executionAnticipee" | "donnees" | "offres", Libelle> = {
  cgv: {
    avant: "J'accepte les ",
    lien: { href: "/cgv", texte: "conditions générales de vente" },
    apres: ".",
  },
  executionAnticipee: { avant: TEXTE_EXECUTION_ANTICIPEE },
  donnees: {
    avant: "J'accepte que mes données servent à traiter ma demande, comme l'explique la ",
    lien: { href: "/confidentialite", texte: "politique de confidentialité" },
    apres: ".",
  },
  offres: { avant: "Je souhaite recevoir vos offres par e-mail (facultatif)." },
};

export const BOUTON_ENVOI = "Envoyer ma demande";

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

const heures = CONDITIONS.delaiPrixFermeHeures;

/** Message de confirmation (partie 9.3). */
export const MESSAGE_DEMANDE_RECUE = `Demande reçue. Nous vous confirmons le prix ferme sous ${heures} ${heures > 1 ? "heures" : "heure"}.`;

/** Rappels avant le rendez-vous : page de remerciement et e-mail au client. */
export const RAPPELS_RENDEZ_VOUS = [
  `Une prise électrique à moins de ${CONDITIONS.priseElectriqueMetres} m de la voiture`,
  "Une voiture accessible, sur votre emplacement",
  "Les objets de valeur retirés de l'habitacle",
  `Votre présence ${CONDITIONS.presenceMinutes} minutes au début et à la fin`,
] as const;

/** Libellé d'une entrée de liste par son identifiant (« tres-sale » → « Très sale… »). */
export function libelleDe<T extends string>(liste: readonly { id: T; libelle: string }[], id: T | ""): string {
  return liste.find((x) => x.id === id)?.libelle ?? "";
}
