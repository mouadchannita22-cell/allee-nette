/**
 * Une voiture du formulaire de réservation : réponses de l'étape 1 (état,
 * animaux, sièges enfants) et formule de l'étape 2. Les réponses et les
 * options correspondantes restent cohérentes dans les deux sens :
 *
 * - « Très sale » ↔ option `tres-sale` ;
 * - « Un peu de poils » ↔ `poils-moderes`, « Beaucoup » ↔ `poils-importants` ;
 * - n sièges enfants ↔ `siege-enfant` × n.
 *
 * Fonctions pures, partagées par le navigateur et le serveur.
 */
import { ANIMAUX, ETATS_VEHICULE, SIEGES_ENFANT_MAX, type Animaux, type EtatVehicule } from "@/data/reservation";
import { abonnementPour, type FormuleId, type Gabarit } from "@/data/offres";
import { basculerOption, nettoyerOptions, type SelectionOptions, type Vehicule } from "@/lib/prix";

export type VoitureFormulaire = {
  /** Modèle saisi (« Peugeot 3008 »). */
  modele: string;
  gabarit: Gabarit;
  /** "" tant que le client n'a pas répondu. */
  etat: EtatVehicule | "";
  animaux: Animaux | "";
  siegesEnfant: number;
  formule: FormuleId;
  options: SelectionOptions;
  abonnement: boolean;
};

export type ReponsesVoiture = Pick<VoitureFormulaire, "etat" | "animaux" | "siegesEnfant">;

/** Voiture vierge : Le Complet, gabarit M (comme le calculateur), questions sans réponse. */
export function nouvelleVoiture(): VoitureFormulaire {
  return {
    modele: "",
    gabarit: "M",
    etat: "",
    animaux: "",
    siegesEnfant: 0,
    formule: "complet",
    options: {},
    abonnement: false,
  };
}

const OPTION_ETAT = ETATS_VEHICULE.find((e) => e.option)!;
const OPTIONS_ANIMAUX = ANIMAUX.flatMap((a) => (a.option ? [{ id: a.id, option: a.option }] : []));

function borner(n: number): number {
  return Number.isInteger(n) ? Math.min(Math.max(n, 0), SIEGES_ENFANT_MAX) : 0;
}

/** Options correspondant aux réponses de l'étape 1, les autres options restant telles quelles. */
export function optionsSelonReponses(options: SelectionOptions, reponses: ReponsesVoiture): SelectionOptions {
  let suivantes = basculerOption(options, OPTION_ETAT.option!, reponses.etat === OPTION_ETAT.id ? 1 : 0);
  const animal = OPTIONS_ANIMAUX.find((a) => a.id === reponses.animaux);
  for (const a of OPTIONS_ANIMAUX) suivantes = basculerOption(suivantes, a.option, 0);
  if (animal) suivantes = basculerOption(suivantes, animal.option, 1);
  return basculerOption(suivantes, "siege-enfant", borner(reponses.siegesEnfant));
}

/** Réponses de l'étape 1 déduites des options (« Sale » reste « Sale » tant que `tres-sale` n'est pas coché). */
export function reponsesSelonOptions(options: SelectionOptions, actuelles: ReponsesVoiture): ReponsesVoiture {
  const tresSale = Boolean(options[OPTION_ETAT.option!]);
  const etat: ReponsesVoiture["etat"] = tresSale
    ? OPTION_ETAT.id
    : actuelles.etat === OPTION_ETAT.id
      ? "sale"
      : actuelles.etat;
  const animal = OPTIONS_ANIMAUX.find((a) => options[a.option]);
  const animaux: ReponsesVoiture["animaux"] = animal
    ? animal.id
    : OPTIONS_ANIMAUX.some((a) => a.id === actuelles.animaux)
      ? "non"
      : actuelles.animaux;
  return { etat, animaux, siegesEnfant: borner(options["siege-enfant"] ?? 0) };
}

/** Étape 1 : le client répond ; les options suivent. */
export function modifierReponses(voiture: VoitureFormulaire, maj: Partial<ReponsesVoiture>): VoitureFormulaire {
  const reponses: ReponsesVoiture = {
    etat: maj.etat ?? voiture.etat,
    animaux: maj.animaux ?? voiture.animaux,
    siegesEnfant: borner(maj.siegesEnfant ?? voiture.siegesEnfant),
  };
  return { ...voiture, ...reponses, options: optionsSelonReponses(voiture.options, reponses) };
}

/** Étape 2 : le client coche ou décoche une option ; les réponses de l'étape 1 suivent. */
export function modifierOptions(voiture: VoitureFormulaire, options: SelectionOptions): VoitureFormulaire {
  const reponses = reponsesSelonOptions(options, voiture);
  // Les sièges sont bornés : on réécrit l'option pour qu'elle corresponde à la réponse.
  return { ...voiture, ...reponses, options: basculerOption(options, "siege-enfant", reponses.siegesEnfant) };
}

/** Changement de formule : options indisponibles retirées, abonnement seulement s'il existe. */
export function changerFormule(voiture: VoitureFormulaire, formule: FormuleId): VoitureFormulaire {
  return {
    ...voiture,
    formule,
    options: nettoyerOptions(formule, voiture.options),
    abonnement: voiture.abonnement && Boolean(abonnementPour(formule)),
  };
}

/** Voiture préremplie depuis le calculateur (paramètres d'URL) : les options décident des réponses. */
export function voitureDepuisVehicule(v: Vehicule, modele = ""): VoitureFormulaire {
  const base: VoitureFormulaire = {
    ...nouvelleVoiture(),
    modele,
    gabarit: v.gabarit,
    formule: v.formule,
    abonnement: Boolean(v.abonnement && abonnementPour(v.formule)),
  };
  return modifierOptions(base, nettoyerOptions(v.formule, v.options ?? {}));
}

/**
 * Voiture transmise au calcul du devis. Les réponses de l'étape 1 font foi
 * pour leurs options : un envoi incohérent ne peut ni doubler ni effacer un supplément.
 */
export function vehiculeDevis(voiture: VoitureFormulaire): Vehicule {
  return {
    formule: voiture.formule,
    gabarit: voiture.gabarit,
    options: optionsSelonReponses(voiture.options, voiture),
    ...(voiture.abonnement && abonnementPour(voiture.formule) ? { abonnement: true } : {}),
  };
}
