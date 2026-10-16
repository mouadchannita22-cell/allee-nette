/**
 * Données du formulaire de réservation (état React), longueurs maximales et
 * valeurs de départ. Sans Zod : le navigateur affiche le formulaire sans
 * attendre le schéma (schema.ts), chargé seulement pour vérifier les réponses.
 */
import {
  REGLES_CRENEAUX,
  type ModePaiement,
  type ReponsePrise,
  type SourceConnaissance,
  type TypeEmplacement,
} from "@/data/reservation";
import type { EtatCalculateur } from "@/lib/devis-url";
import type { SourceVisite } from "@/lib/source-visite";
import { voitureDepuisVehicule, type VoitureFormulaire } from "./voiture";

/** État complet du formulaire. "" : pas encore de réponse. */
export type DonneesFormulaire = {
  voitures: VoitureFormulaire[];
  lieu: {
    /** Numéro et rue. */
    adresse: string;
    commune: string;
    emplacement: TypeEmplacement | "";
    prise: ReponsePrise | "";
  };
  /** Trois créneaux par ordre de préférence (identifiants de `creneauxDisponibles`), "" si vide. */
  creneaux: string[];
  coordonnees: {
    prenom: string;
    telephone: string;
    email: string;
    connaissance: SourceConnaissance | "";
    code: string;
  };
  paiement: ModePaiement | "";
  validation: { cgv: boolean; executionAnticipee: boolean; donnees: boolean; offres: boolean };
  /** Source de la visite (lib/source-visite.ts), jointe au moment de l'envoi. */
  source: SourceVisite;
};

/** Longueurs maximales, à reprendre dans les attributs `maxLength` des champs. */
export const LONGUEURS = {
  modele: 60,
  adresse: 120,
  commune: 80,
  prenom: 60,
  telephone: 30,
  email: 120,
  code: 20,
} as const;

/** Formulaire prérempli depuis l'URL du calculateur (`depuisParametres`). */
export function formulaireInitial(depart?: EtatCalculateur): DonneesFormulaire {
  const code = depart?.code ?? "";
  const connaissance: SourceConnaissance | "" = code === "GARAGE" ? "garagiste" : code === "VOISIN" ? "voisin" : "";
  return {
    voitures: (depart?.vehicules ?? [{ formule: "complet", gabarit: "M" }]).map((v) => voitureDepuisVehicule(v)),
    lieu: { adresse: "", commune: depart?.commune ?? "", emplacement: "", prise: "" },
    creneaux: Array.from({ length: REGLES_CRENEAUX.nombreDemandes }, () => ""),
    coordonnees: { prenom: "", telephone: "", email: "", connaissance, code },
    paiement: "",
    validation: { cgv: false, executionAnticipee: false, donnees: false, offres: false },
    source: {},
  };
}

/**
 * Erreurs par champ, en français. Clé : chemin du champ joint par des points
 * (« voitures.0.modele », « lieu.commune », « creneaux.0 », « validation.cgv »).
 * La clé « devis » porte un blocage de l'estimation (zone 2 avec L'Intérieur
 * Net, commande minimale…).
 */
export type ErreursChamps = Record<string, string>;
