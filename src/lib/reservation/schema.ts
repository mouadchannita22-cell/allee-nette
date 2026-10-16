/**
 * Schéma de la demande de réservation (Zod), partagé par le navigateur
 * (erreurs affichées étape par étape) et par le serveur (contrôle de l'envoi).
 *
 * Chaque texte a une longueur maximale ; les listes de choix viennent de
 * `data/reservation.ts` et `data/offres.ts`. Le total n'est jamais envoyé :
 * le serveur le recalcule avec `devisReservation`.
 */
import { z } from "zod";
import { CODES_GABARIT, FORMULES, OPTIONS, type OptionId } from "@/data/offres";
import {
  ANIMAUX,
  ETATS_VEHICULE,
  MAX_VOITURES,
  MODES_PAIEMENT,
  REGLES_CRENEAUX,
  REPONSES_PRISE,
  SIEGES_ENFANT_MAX,
  SOURCES_CONNAISSANCE,
  TYPES_EMPLACEMENT,
  type NumeroEtape,
} from "@/data/reservation";
import { nettoyerSource } from "@/lib/source-visite";
import { normaliserTelephone } from "@/lib/telephone";
import { creneauAutorise, lireCreneau } from "./creneaux";
import { blocageDevis, devisReservation } from "./devis";
import { LONGUEURS, type DonneesFormulaire, type ErreursChamps } from "./formulaire";

// Données du formulaire, longueurs et valeurs de départ : dans formulaire.ts,
// sans Zod, pour que le navigateur ne charge Zod qu'au moment de vérifier.
export { LONGUEURS, formulaireInitial, type DonneesFormulaire, type ErreursChamps } from "./formulaire";

// ---------------------------------------------------------------------------
// Briques
// ---------------------------------------------------------------------------

const ids = <T extends string>(liste: readonly { id: T }[]): T[] => liste.map((x) => x.id);

/** Texte sur une ligne, obligatoire, borné. */
function texte(max: number, requis: string) {
  return z
    .string({ error: requis })
    .trim()
    .min(1, { error: requis })
    .max(max, { error: `${max} caractères au plus.` })
    .refine((s) => !/\p{Cc}/u.test(s), { error: "Ce texte contient des caractères non autorisés." });
}

const MESSAGES = {
  telephone: "Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.",
  email: "Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.",
  creneauRequis: "Choisissez au moins un créneau.",
} as const;

/** Bloc entier absent ou mal formé (envoi trafiqué). */
const BLOC_MANQUANT = { error: "Réponses manquantes : revenez à cette étape." };

const voitureReponses = {
  modele: texte(LONGUEURS.modele, "Indiquez le modèle de la voiture, par exemple Clio ou 3008."),
  gabarit: z.enum(CODES_GABARIT, { error: "Choisissez le gabarit de la voiture." }),
  etat: z.enum(ids(ETATS_VEHICULE), { error: "Indiquez l'état de la voiture." }),
  animaux: z.enum(ids(ANIMAUX), { error: "Indiquez s'il y a des poils d'animaux." }),
  siegesEnfant: z
    .number({ error: "Indiquez le nombre de sièges enfants." })
    .int({ error: "Indiquez le nombre de sièges enfants." })
    .min(0, { error: `De 0 à ${SIEGES_ENFANT_MAX} sièges enfants.` })
    .max(SIEGES_ENFANT_MAX, { error: `De 0 à ${SIEGES_ENFANT_MAX} sièges enfants.` }),
};

const OPTION_INVALIDE = { error: "Une option n'est pas valable : décochez-la puis cochez-la de nouveau." };

const voitureFormule = {
  formule: z.enum(ids(FORMULES), { error: "Choisissez une formule." }),
  options: z.partialRecord(
    z.enum(OPTIONS.map((o) => o.id) as OptionId[], OPTION_INVALIDE),
    z.number(OPTION_INVALIDE).int(OPTION_INVALIDE).min(1, OPTION_INVALIDE).max(10, OPTION_INVALIDE),
    OPTION_INVALIDE,
  ),
  abonnement: z.boolean({ error: "Indiquez si vous souhaitez l'abonnement." }),
};

function listeVoitures<T extends z.ZodRawShape>(champs: T) {
  return z
    .array(z.object(champs, BLOC_MANQUANT), { error: "Ajoutez au moins une voiture." })
    .min(1, { error: "Ajoutez au moins une voiture." })
    .max(MAX_VOITURES, { error: `${MAX_VOITURES} voitures au plus par demande.` });
}

const MESSAGE_ADRESSE = "Indiquez l'adresse d'intervention : numéro et rue.";

const lieu = z.object(
  {
    adresse: texte(LONGUEURS.adresse, MESSAGE_ADRESSE).refine((s) => s.length >= 3, { error: MESSAGE_ADRESSE }),
    commune: texte(LONGUEURS.commune, "Indiquez votre commune."),
    emplacement: z.enum(ids(TYPES_EMPLACEMENT), { error: "Choisissez où se trouve la voiture." }),
    prise: z.enum(ids(REPONSES_PRISE), { error: "Dites-nous s'il y a une prise électrique à proximité." }),
  },
  BLOC_MANQUANT,
);

const telephone = z
  .string({ error: MESSAGES.telephone })
  .trim()
  .max(LONGUEURS.telephone, { error: MESSAGES.telephone })
  .transform((saisie, ctx) => {
    const numero = normaliserTelephone(saisie);
    if (numero) return numero;
    ctx.addIssue({ code: "custom", message: MESSAGES.telephone });
    return z.NEVER;
  });

const coordonnees = z.object(
  {
    prenom: texte(LONGUEURS.prenom, "Indiquez votre prénom."),
    telephone,
    email: z
      .string({ error: MESSAGES.email })
      .trim()
      .max(LONGUEURS.email, { error: MESSAGES.email })
      .pipe(z.email({ error: MESSAGES.email })),
    connaissance: z.enum([...ids(SOURCES_CONNAISSANCE), ""], { error: "Choisissez une réponse dans la liste." }),
    code: z
      .string({ error: "Code invalide." })
      .trim()
      .max(LONGUEURS.code, { error: `${LONGUEURS.code} caractères au plus.` })
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9-]*$/, { error: "Lettres, chiffres et tirets seulement." })),
  },
  BLOC_MANQUANT,
);

const paiement = z.enum(ids(MODES_PAIEMENT), { error: "Choisissez comment vous préférez payer." });

const validation = z.object(
  {
    cgv: z.literal(true, { error: "Acceptez les conditions générales de vente pour envoyer votre demande." }),
    executionAnticipee: z.literal(true, {
      error: "Cochez cette case pour que la prestation puisse avoir lieu dans les 14 jours.",
    }),
    donnees: z.literal(true, {
      error: "Acceptez le traitement de vos données : sans elles, nous ne pouvons pas traiter votre demande.",
    }),
    offres: z.boolean({ error: "Réponse invalide." }),
  },
  BLOC_MANQUANT,
);

/** Contexte de la validation des créneaux. */
export type ContexteValidation = {
  maintenant: Date;
  /** Jours de tolérance autour de la fenêtre proposée (1 côté serveur). */
  toleranceJours?: number;
};

function creneaux({ maintenant, toleranceJours = 0 }: ContexteValidation) {
  return z
    .array(z.string({ error: "Créneau invalide." }).max(30, { error: "Créneau invalide." }), {
      error: MESSAGES.creneauRequis,
    })
    .max(REGLES_CRENEAUX.nombreDemandes, { error: `${REGLES_CRENEAUX.nombreDemandes} créneaux au plus.` })
    .superRefine((liste, ctx) => {
      if (liste.filter(Boolean).length < REGLES_CRENEAUX.minimum) {
        ctx.addIssue({ code: "custom", path: [0], message: MESSAGES.creneauRequis });
      }
      const vus = new Set<string>();
      liste.forEach((id, i) => {
        if (!id) return;
        if (!creneauAutorise(id, maintenant, toleranceJours)) {
          ctx.addIssue({
            code: "custom",
            path: [i],
            message: lireCreneau(id) ? "Ce créneau n'est plus proposé : choisissez-en un autre." : "Créneau invalide.",
          });
        } else if (vus.has(id)) {
          ctx.addIssue({ code: "custom", path: [i], message: "Vous avez déjà choisi ce créneau." });
        }
        vus.add(id);
      });
    })
    .transform((liste) => liste.filter(Boolean));
}

// ---------------------------------------------------------------------------
// Schéma complet
// ---------------------------------------------------------------------------

/** Schéma de la demande complète. Le serveur l'utilise avec `toleranceJours: 1`. */
export function creerSchemaReservation(contexte: ContexteValidation) {
  return z.object({
    voitures: listeVoitures({ ...voitureReponses, ...voitureFormule }),
    lieu,
    creneaux: creneaux(contexte),
    coordonnees,
    paiement,
    validation,
    source: z.unknown().optional().transform(nettoyerSource),
  });
}

/** Demande validée : téléphone normalisé, code en majuscules, créneaux vides retirés. */
export type DemandeReservation = z.output<ReturnType<typeof creerSchemaReservation>>;

// ---------------------------------------------------------------------------
// Erreurs par étape
// ---------------------------------------------------------------------------

/** Première erreur de chaque champ. */
export function erreursDepuisZod(erreur: z.ZodError): ErreursChamps {
  const erreurs: ErreursChamps = {};
  for (const issue of erreur.issues) {
    const cle = issue.path.map(String).join(".") || "formulaire";
    erreurs[cle] ??= issue.message;
  }
  return erreurs;
}

function verifier(schema: z.ZodType, donnees: unknown): ErreursChamps {
  const r = schema.safeParse(donnees);
  return r.success ? {} : erreursDepuisZod(r.error);
}

const SCHEMAS_ETAPES = {
  1: z.object({ voitures: listeVoitures(voitureReponses) }),
  2: z.object({ voitures: listeVoitures(voitureFormule) }),
  3: z.object({ lieu }),
  5: z.object({ coordonnees }),
  6: z.object({ paiement }),
  7: z.object({ validation }),
} as const;

/**
 * Erreurs d'une étape, avant de passer à la suivante (objet vide : tout va bien).
 * `maintenant` sert aux créneaux : lisez l'heure dans un gestionnaire d'évènement.
 */
export function erreursEtape(etape: NumeroEtape, donnees: DonneesFormulaire, maintenant: Date): ErreursChamps {
  if (etape === 4) return verifier(z.object({ creneaux: creneaux({ maintenant }) }), donnees);
  const erreurs = verifier(SCHEMAS_ETAPES[etape], donnees);
  if (Object.keys(erreurs).length > 0) return erreurs;

  if (etape === 2 || etape === 3) {
    // Sans commune (étape 2), l'estimation part de la zone 1.
    const resultat = devisReservation({
      voitures: donnees.voitures,
      commune: donnees.lieu.commune,
      code: donnees.coordonnees.code,
    });
    // Le refus de zone 2 se règle à l'étape 3, où la commune se choisit.
    const blocage = etape === 2 && resultat.statut === "refuse" ? null : blocageDevis(resultat);
    if (blocage) erreurs.devis = blocage;
  }
  return erreurs;
}

/** Erreurs de tout le formulaire, avec la première étape à corriger (`null` si tout va bien). */
export function erreursFormulaire(
  donnees: DonneesFormulaire,
  maintenant: Date,
): { etape: NumeroEtape | null; erreurs: ErreursChamps } {
  for (const etape of [1, 2, 3, 4, 5, 6, 7] as const) {
    const erreurs = erreursEtape(etape, donnees, maintenant);
    if (Object.keys(erreurs).length > 0) return { etape, erreurs };
  }
  return { etape: null, erreurs: {} };
}
