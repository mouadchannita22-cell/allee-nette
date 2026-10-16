/**
 * Dates à l'heure de Paris, quel que soit le fuseau du navigateur ou du
 * serveur (les fonctions Netlify tournent en UTC). Fonctions pures.
 *
 * Les jours du calendrier sont manipulés en « jours depuis le 1er janvier
 * 1970 », sans heure : aucun piège de changement d'heure.
 */

const FUSEAU = "Europe/Paris";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

const JOUR_MS = 86_400_000;

const formateur = new Intl.DateTimeFormat("en-GB", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

export type PartiesDate = { annee: number; mois: number; jour: number; heure: number; minute: number };

/** Année, mois (1 à 12), jour, heure et minute à Paris. */
export function partiesParis(date: Date): PartiesDate {
  const parties = formateur.formatToParts(date);
  const valeur = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parties.find((p) => p.type === type)?.value ?? Number.NaN);
  return {
    annee: valeur("year"),
    mois: valeur("month"),
    jour: valeur("day"),
    heure: valeur("hour") % 24,
    minute: valeur("minute"),
  };
}

/** Année en cours à Paris (le 31 décembre à 23 h 30 UTC, c'est déjà l'année suivante). */
export function anneeParis(date: Date): number {
  return partiesParis(date).annee;
}

/** Jour du calendrier à Paris, en jours depuis le 1er janvier 1970. */
export function jourParis(date: Date): number {
  const { annee, mois, jour } = partiesParis(date);
  return Date.UTC(annee, mois - 1, jour) / JOUR_MS;
}

/** Jour du calendrier → « AAAA-MM-JJ ». */
export function versIso(jour: number): string {
  return new Date(jour * JOUR_MS).toISOString().slice(0, 10);
}

/** « AAAA-MM-JJ » → jour du calendrier, ou `null` si la date n'existe pas. */
export function depuisIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const jour = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / JOUR_MS;
  return versIso(jour) === iso ? jour : null;
}

/** Jour de la semaine : 0 = dimanche… 6 = samedi. */
export function jourSemaine(jour: number): number {
  return new Date(jour * JOUR_MS).getUTCDay();
}

/** « mercredi 21 octobre » (ou « … 2027 » si `avecAnnee`). */
export function formaterJour(jour: number, avecAnnee = false): string {
  const d = new Date(jour * JOUR_MS);
  const texte = `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
  return avecAnnee ? `${texte} ${d.getUTCFullYear()}` : texte;
}

/** « vendredi 16 octobre 2026 à 15 h 42 », à l'heure de Paris. */
export function formaterDateHeureParis(date: Date): string {
  const { heure, minute } = partiesParis(date);
  return `${formaterJour(jourParis(date), true)} à ${heure} h ${String(minute).padStart(2, "0")}`;
}

/** Première lettre en majuscule. */
export function capitaliser(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
