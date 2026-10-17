/**
 * Mesure d'audience sans cookie (Umami), partie 14 du brief. Le script est
 * chargé par components/layout/MesureAudience.tsx, seulement si
 * NEXT_PUBLIC_UMAMI_WEBSITE_ID est défini, une fois la page chargée.
 *
 * - Sans script (variable absente, bloqueur, réseau coupé), les appels ne
 *   font rien : le site fonctionne à l'identique.
 * - Un événement émis avant l'arrivée du script (étape 1 de la réservation,
 *   paiement réussi…) attend en mémoire de la page, puis part à son arrivée.
 * - Aucune donnée personnelle : les données d'un événement sont limitées,
 *   par leur type, à des valeurs fixes.
 *
 * Sens de chaque événement : docs/mesure-audience.md.
 */
export type Evenement =
  | "calculateur_utilise"
  | `reservation_etape_${number}`
  | "demande_envoyee"
  | "clic_whatsapp"
  | "clic_telephone"
  | "paiement_initie"
  | "paiement_reussi";

/** Les seules données qu'un événement peut porter. */
export type DonneesEvenement = {
  /** Moyen de paiement (paiement_initie, paiement_reussi). */
  moyen?: "stripe" | "paypal";
  /** Outil utilisé (calculateur_utilise) : calculateur de prix ou vérificateur de commune. */
  outil?: "calculateur" | "zones";
};

declare global {
  interface Window {
    umami?: { track: (nom: string, donnees?: DonneesEvenement) => void };
  }
}

/** Événements émis avant l'arrivée du script, dans l'ordre. */
const enAttente: [Evenement, DonneesEvenement | undefined][] = [];
const ATTENTE_MAX = 20;

/** Événements « une fois par visite » déjà émis (mémoire de la page, rien n'est stocké). */
const dejaEmis = new Set<Evenement>();

function envoyer(nom: Evenement, donnees: DonneesEvenement | undefined): boolean {
  const umami = window.umami;
  if (!umami) return false;
  try {
    umami.track(nom, donnees);
  } catch {
    // La mesure d'audience ne doit jamais gêner la navigation.
  }
  return true;
}

/** Émet un événement. Sans effet côté serveur. */
export function suivre(nom: Evenement, donnees?: DonneesEvenement): void {
  if (typeof window === "undefined") return;
  if (envoyer(nom, donnees)) return;
  if (enAttente.length < ATTENTE_MAX) enAttente.push([nom, donnees]);
}

/**
 * Émet un événement une seule fois pendant la visite (un rechargement
 * complet repart de zéro), par exemple la première interaction avec un
 * calculateur, quel qu'il soit.
 */
export function suivreUneFois(nom: Evenement, donnees?: DonneesEvenement): void {
  if (typeof window === "undefined" || dejaEmis.has(nom)) return;
  dejaEmis.add(nom);
  suivre(nom, donnees);
}

/** Envoie les événements en attente : appelé à l'arrivée du script Umami. */
export function viderFileAttente(): void {
  if (typeof window === "undefined" || !window.umami) return;
  for (const [nom, donnees] of enAttente.splice(0)) envoyer(nom, donnees);
}

/**
 * Événement d'un clic sur un lien : `clic_telephone` pour un lien `tel:`,
 * `clic_whatsapp` pour un lien WhatsApp (wa.me, whatsapp.com), sinon `null`.
 * Sert à l'écoute unique des clics (MesureAudience) : tous les liens du site
 * sont comptés, barre mobile, pied de page, pages légales comprises.
 */
export function evenementDuLien(href: string | null | undefined): "clic_telephone" | "clic_whatsapp" | null {
  if (!href) return null;
  const adresse = href.trim();
  if (/^tel:/i.test(adresse)) return "clic_telephone";
  if (/^whatsapp:/i.test(adresse)) return "clic_whatsapp";
  try {
    const { protocol, hostname } = new URL(adresse);
    if (protocol !== "https:" && protocol !== "http:") return null;
    const hote = hostname.toLowerCase();
    if (hote === "wa.me" || hote === "whatsapp.com" || hote.endsWith(".whatsapp.com")) return "clic_whatsapp";
  } catch {
    // Adresse relative ou invalide : pas un lien de contact.
  }
  return null;
}

/** Pour les tests : oublie la file d'attente et les événements « une fois ». */
export function reinitialiserMesure(): void {
  enAttente.length = 0;
  dejaEmis.clear();
}
