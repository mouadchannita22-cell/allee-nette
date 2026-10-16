/**
 * Mesure d'audience sans cookie (Umami). Si le script n'est pas chargé,
 * les appels ne font rien : le site fonctionne à l'identique.
 */
export type Evenement =
  | "calculateur_utilise"
  | `reservation_etape_${number}`
  | "demande_envoyee"
  | "clic_whatsapp"
  | "clic_telephone"
  | "paiement_initie"
  | "paiement_reussi";

type Donnees = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (nom: string, donnees?: Donnees) => void };
  }
}

export function suivre(nom: Evenement, donnees?: Donnees): void {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(nom, donnees);
  } catch {
    // La mesure d'audience ne doit jamais gêner la navigation.
  }
}
