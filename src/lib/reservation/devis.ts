/**
 * Estimation d'une demande de réservation : le même calcul dans le
 * navigateur (total affiché) et sur le serveur (total recalculé, jamais
 * repris du navigateur).
 */
import type { ZoneTarif } from "@/data/offres";
import { calculerDevis, type Avertissement, type LigneDevis, type ResultatDevis } from "@/lib/prix";
import { zoneDeCommune } from "@/lib/zones";
import { vehiculeDevis, type VoitureFormulaire } from "./voiture";

export type EntreeReservation = {
  voitures: readonly VoitureFormulaire[];
  commune: string;
  code: string;
};

/** Zone de la commune saisie. Tant qu'aucune commune n'est indiquée, l'estimation part de la zone 1. */
export function zoneReservation(commune: string): ZoneTarif {
  return commune.trim() ? zoneDeCommune(commune) : "zone1";
}

/**
 * Devis de la demande. `zone` remplace la zone déduite de la commune
 * (par exemple celle du champ commune pendant la saisie).
 */
export function devisReservation(entree: EntreeReservation, zone = zoneReservation(entree.commune)): ResultatDevis {
  return calculerDevis({ vehicules: entree.voitures.map(vehiculeDevis), zone, code: entree.code });
}

/** Ce qu'apporte le code saisi : lignes ajoutées au devis et remarques (code inconnu, à vérifier…). */
export type EffetCode = { lignes: LigneDevis[]; remarques: string[] };

const REMARQUES_CODE: readonly Avertissement["code"][] = ["garage-creneau", "code-a-verifier", "code-inconnu"];

/**
 * Effet du code sur l'estimation, par comparaison avec le même devis sans
 * code. `null` sans code, ou si l'estimation n'est pas chiffrée (hors zone…).
 */
export function effetDuCode(entree: EntreeReservation, zone = zoneReservation(entree.commune)): EffetCode | null {
  if (!entree.code.trim()) return null;
  const avec = devisReservation(entree, zone);
  const sans = devisReservation({ ...entree, code: "" }, zone);
  if (avec.statut !== "estimation" || sans.statut !== "estimation") return null;
  const deja = new Set(sans.lignes.map((l) => l.libelle));
  return {
    lignes: avec.lignes.filter((l) => !deja.has(l.libelle)),
    remarques: avec.avertissements.filter((a) => REMARQUES_CODE.includes(a.code)).map((a) => a.message),
  };
}

/**
 * Message qui empêche d'envoyer la demande, ou `null`. Hors zone, la
 * demande reste possible (« sur demande ») ; en zone 2 avec L'Intérieur Net
 * seul, il faut d'abord changer de formule.
 */
export function blocageDevis(resultat: ResultatDevis): string | null {
  if (resultat.statut === "refuse") return `${resultat.message}.`;
  if (resultat.statut === "invalide") return resultat.message;
  return null;
}
