/**
 * Estimation d'une demande de réservation : le même calcul dans le
 * navigateur (total affiché) et sur le serveur (total recalculé, jamais
 * repris du navigateur).
 */
import type { ZoneTarif } from "@/data/offres";
import { calculerDevis, type ResultatDevis } from "@/lib/prix";
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
