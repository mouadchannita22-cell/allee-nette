/**
 * Champs du formulaire de réservation : identifiants dans la page, étape de
 * chaque champ. Fonctions pures, utilisées par le résumé d'erreurs (liens
 * vers les champs) et pour ramener le client à la bonne étape quand le
 * serveur refuse une réponse.
 *
 * Les clés sont celles de `erreursEtape` (lib/reservation/schema.ts) :
 * « voitures.0.modele », « lieu.commune », « creneaux.0 », « devis »…
 */
import { FORMULES, GABARITS } from "@/data/offres";
import { PHOTOS_DEMANDEES, type NumeroEtape } from "@/data/reservation";

/** Identifiant d'un champ dans la page : « voitures.0.modele » → « champ-voitures-0-modele ». */
export function idChamp(cle: string): string {
  return `champ-${cle.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
}

/** Identifiant du message d'erreur d'un champ. */
export function idErreur(cle: string): string {
  return `${idChamp(cle)}-erreur`;
}

/**
 * Élément à atteindre depuis le résumé d'erreurs. Les groupes de boutons
 * (formule, gabarit) sont atteints par leur premier choix, les options par
 * leur liste.
 */
export function cibleErreur(cle: string): string {
  const voiture = /^voitures\.(\d+)(?:\.(\w+))?/.exec(cle);
  if (voiture) {
    const prefixe = idChamp(`voitures.${voiture[1]}`);
    switch (voiture[2]) {
      case "formule":
        return `${prefixe}-formule-${FORMULES[0]!.id}`;
      case "gabarit":
        return `${prefixe}-gabarit-${GABARITS[0]!.code}`;
      case "options":
      case "abonnement":
        return `${prefixe}-options`;
      case undefined:
        return `${prefixe}-modele`;
    }
  }
  if (cle === "creneaux") return idChamp("creneaux.0");
  return idChamp(cle);
}

/** Étape où se corrige un champ (le blocage « devis » se règle au lieu, où se choisit la commune). */
export function etapeDuChamp(cle: string): NumeroEtape {
  const [racine, , sous] = cle.split(".");
  switch (racine) {
    case "voitures":
      return sous === "formule" || sous === "options" || sous === "abonnement" ? 2 : 1;
    case "lieu":
    case "devis":
      return 3;
    case "creneaux":
      return 4;
    case "coordonnees":
      return 5;
    case "paiement":
      return 6;
    default:
      return PHOTOS_DEMANDEES.some((p) => p.champ === cle) ? 6 : 7;
  }
}
