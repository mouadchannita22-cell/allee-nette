/**
 * Anti-spam sans stockage ni captcha (partie 9.3 du brief, ajustement 5 du
 * plan). Fonctions pures, testées :
 *
 * - champ piège invisible : un robot qui le remplit reçoit un faux succès,
 *   et rien n'est envoyé ;
 * - délai minimal de 8 s entre l'ouverture du formulaire et l'envoi. Les deux
 *   horodatages viennent du navigateur : un téléphone à l'heure décalée n'est
 *   pas pénalisé. Le navigateur attend lui-même le temps restant ;
 * - limitation du débit en mémoire, par adresse IP : 5 demandes par
 *   10 minutes. Les adresses restent en mémoire 10 minutes au plus, jamais
 *   écrites ni journalisées. Chaque instance de fonction Netlify a sa propre
 *   mémoire : c'est un frein, pas une barrière absolue.
 */

/** Attribut `name` du champ piège (masqué aux humains et aux lecteurs d'écran, tabindex=-1, autocomplete=off). */
export const NOM_CHAMP_PIEGE = "site_web";

export const DELAI_MINIMAL_MS = 8_000;

/** Données anti-spam jointes à la demande par le navigateur. */
export type AntiSpam = {
  /** Contenu du champ piège : vide pour un humain. */
  piege: string;
  /** `Date.now()` du navigateur à l'ouverture du formulaire. */
  ouvertLe: number;
  /** `Date.now()` du navigateur au moment de l'envoi. */
  envoyeLe: number;
};

/** Lit les données anti-spam d'un envoi, sans jamais lever d'erreur. */
export function lireAntiSpam(brut: unknown): AntiSpam {
  const objet = typeof brut === "object" && brut !== null ? (brut as Record<string, unknown>) : {};
  const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number.NaN);
  return {
    piege: typeof objet.piege === "string" ? objet.piege : "",
    ouvertLe: nombre(objet.ouvertLe),
    envoyeLe: nombre(objet.envoyeLe),
  };
}

/** Le champ piège a été rempli : c'est un robot. */
export function piegeRempli(antiSpam: AntiSpam): boolean {
  return antiSpam.piege.trim() !== "";
}

/** Au moins 8 s entre l'ouverture et l'envoi (horodatages manquants : refusé). */
export function delaiRespecte(antiSpam: AntiSpam): boolean {
  const { ouvertLe, envoyeLe } = antiSpam;
  return ouvertLe > 0 && envoyeLe - ouvertLe >= DELAI_MINIMAL_MS;
}

/** Côté navigateur : temps à attendre avant d'envoyer (0 si le délai est déjà passé). */
export function attenteAvantEnvoi(ouvertLe: number, maintenant: number): number {
  return Math.max(0, DELAI_MINIMAL_MS - (maintenant - ouvertLe));
}

// ---------------------------------------------------------------------------
// Limitation du débit
// ---------------------------------------------------------------------------

export type ReglesDebit = { max: number; fenetreMs: number };

/** 5 demandes par 10 minutes et par adresse IP. */
export const DEBIT_PRODUCTION: ReglesDebit = { max: 5, fenetreMs: 10 * 60_000 };

/**
 * Règles appliquées. En production : toujours 5 par 10 minutes. Ailleurs
 * (local, aperçus), `reglage` (variable RESERVATION_LIMITE_DEBIT) peut
 * relever le maximum, pour que les tests de bout en bout ne se bloquent pas.
 */
export function reglesDebit(production: boolean, reglage: string | undefined): ReglesDebit {
  if (production) return DEBIT_PRODUCTION;
  const max = Number(reglage);
  return Number.isInteger(max) && max > 0 ? { ...DEBIT_PRODUCTION, max } : DEBIT_PRODUCTION;
}

/** Horodatages des demandes récentes, par adresse. */
export type MemoireDebit = Map<string, number[]>;

/** Au-delà, les adresses inactives sont oubliées à chaque passage. */
const TAILLE_AVANT_MENAGE = 500;

/** Enregistre une demande et dit si elle est autorisée ; sinon, dans combien de temps réessayer. */
export function verifierDebit(
  memoire: MemoireDebit,
  cle: string,
  maintenant: number,
  regles: ReglesDebit,
): { autorise: boolean; reessayerDansMs: number } {
  const limite = maintenant - regles.fenetreMs;
  if (memoire.size > TAILLE_AVANT_MENAGE) {
    for (const [autre, dates] of memoire) {
      if (dates.every((d) => d <= limite)) memoire.delete(autre);
    }
  }
  const recentes = (memoire.get(cle) ?? []).filter((d) => d > limite);
  if (recentes.length >= regles.max) {
    memoire.set(cle, recentes);
    return { autorise: false, reessayerDansMs: recentes[0]! + regles.fenetreMs - maintenant };
  }
  recentes.push(maintenant);
  memoire.set(cle, recentes);
  return { autorise: true, reessayerDansMs: 0 };
}

/** Adresse IP du client : en-tête posé par Netlify, sinon le premier maillon de x-forwarded-for. */
export function adresseClient(entetes: Headers): string {
  const netlify = entetes.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;
  return entetes.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}
