/**
 * Montants des liens de paiement : saisis ou lus en euros (« 119 »,
 * « 119.5 », « 119,50 »), toujours calculés en centimes entiers, jamais en
 * nombres à virgule. Fonctions pures, utilisables côté serveur comme dans
 * le navigateur.
 */
import { BORNES_MONTANT } from "@/data/paiement";

/** Bornes en centimes, déduites de data/paiement.ts. */
export const CENTIMES_MIN = BORNES_MONTANT.minEuros * 100;
export const CENTIMES_MAX = BORNES_MONTANT.maxEuros * 100;

/** Euros entiers ou avec deux décimales au plus, point ou virgule. Ni signe, ni espace, ni séparateur de milliers. */
const FORMAT_MONTANT = /^(\d{1,6})(?:[.,](\d{1,2}))?$/;

/**
 * Montant en euros → centimes entiers, ou `null` si le format n'est pas
 * reconnu (texte, négatif, plus de deux décimales…). Ne vérifie pas les
 * bornes : voir `montantAutorise`.
 *
 * « 119 », « 119.0 » et « 119.00 » → 11900 ; « 119.5 » et « 119,50 » → 11950.
 */
export function normaliserMontant(saisie: string | number): number | null {
  const texte = typeof saisie === "number" ? (Number.isFinite(saisie) ? String(saisie) : "") : saisie.trim();
  const m = FORMAT_MONTANT.exec(texte);
  if (!m) return null;
  const euros = Number(m[1]);
  const centimes = Number((m[2] ?? "").padEnd(2, "0"));
  return euros * 100 + centimes;
}

/** Montant compris entre les bornes de data/paiement.ts (15 € et 600 €, bornes comprises). */
export function montantAutorise(centimes: number): boolean {
  return Number.isInteger(centimes) && centimes >= CENTIMES_MIN && centimes <= CENTIMES_MAX;
}

/** Forme canonique dans une URL : « 119 » ou « 119.50 ». */
export function montantPourUrl(centimes: number): string {
  const euros = Math.trunc(centimes / 100);
  const reste = centimes % 100;
  return reste === 0 ? String(euros) : `${euros}.${String(reste).padStart(2, "0")}`;
}

/**
 * Montant affiché : « 119 € » ou « 119,50 € ». Espace insécable avant « € »
 * par défaut ; `espace: " "` pour un SMS (l'espace insécable ferait passer
 * le message dans un encodage plus coûteux).
 */
export function formaterEuros(centimes: number, espace = " "): string {
  return `${montantPourUrl(centimes).replace(".", ",")}${espace}€`;
}
