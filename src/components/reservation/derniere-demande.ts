/**
 * Dernière demande envoyée pendant la visite, gardée en mémoire du module
 * pour la page de remerciement (la page /reserver est démontée à la
 * navigation). Ni cookie, ni stockage du navigateur : un rechargement de
 * la page l'efface, et la page de remerciement affiche alors un texte générique.
 */
import type { ZoneTarif } from "@/data/offres";
import type { DonneesFormulaire } from "@/lib/reservation/formulaire";

export type DemandeEnvoyee = {
  reference: string;
  /** Mode démonstration : aucun e-mail n'est parti. */
  demo: boolean;
  donnees: DonneesFormulaire;
  zone: ZoneTarif;
  /** Libellés des photos jointes. */
  photos: readonly string[];
};

let derniere: DemandeEnvoyee | null = null;

/** Retient la demande qui vient de partir (remplace la précédente). */
export function retenirDemande(demande: DemandeEnvoyee): void {
  derniere = demande;
}

/** Demande envoyée sous cette référence pendant la visite, sinon `null`. */
export function demandeEnvoyee(reference: string): DemandeEnvoyee | null {
  return derniere?.reference === reference ? derniere : null;
}
