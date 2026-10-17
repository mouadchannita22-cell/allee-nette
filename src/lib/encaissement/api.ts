/**
 * Échanges entre la page /paiement (navigateur) et les routes de paiement :
 * session Stripe Checkout, commande et capture PayPal. Sans secret ni
 * node:crypto : le navigateur charge ce module. Le navigateur renvoie les
 * paramètres signés du lien tels quels ; le serveur les revérifie toujours.
 */
import type { Encaisseur } from "@/config/site";
import { montantPourUrl } from "@/lib/montant";

export const URL_API_SESSION = "/api/paiement/session";
export const URL_API_PAYPAL_COMMANDE = "/api/paiement/paypal/commande";
export const URL_API_PAYPAL_CAPTURE = "/api/paiement/paypal/capture";

/** Paramètres d'un lien de paiement signé, dans l'ordre du lien. */
export const CLES_LIEN = ["ref", "montant", "libelle", "encaisseur", "exp", "sig"] as const;

/** Paramètres signés, tels qu'ils figurent dans le lien. */
export type ParametresLien = Record<(typeof CLES_LIEN)[number], string> & { encaisseur: Encaisseur };

/** Paramètres signés d'un lien vérifié par le serveur, à transmettre au navigateur. */
export function parametresLien(lien: {
  ref: string;
  centimes: number;
  libelle: string;
  encaisseur: Encaisseur;
  exp: number;
  sig: string;
}): ParametresLien {
  return {
    ref: lien.ref,
    montant: montantPourUrl(lien.centimes),
    libelle: lien.libelle,
    encaisseur: lien.encaisseur,
    exp: String(lien.exp),
    sig: lien.sig,
  };
}

/** Paramètres signés lus dans un corps JSON (chaînes seulement), pour les revérifier côté serveur. */
export function parametresDepuisJson(json: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const cle of CLES_LIEN) {
    const valeur = json[cle];
    if (typeof valeur === "string") params.set(cle, valeur);
  }
  return params;
}

// ---------------------------------------------------------------------------
// Réponses des routes, lues sans faire confiance à leur forme
// ---------------------------------------------------------------------------

export type Refus = { ok: false; message: string };

/** Session Stripe Checkout créée : le navigateur part vers `url`. */
export type ReponseSession = { ok: true; url: string } | Refus;

/** Commande PayPal créée : son identifiant est rendu au SDK PayPal. */
export type ReponseCommande = { ok: true; id: string } | Refus;

/**
 * Commande PayPal capturée : le navigateur part vers `redirection` (page de
 * remerciement). `relancer` : moyen de paiement refusé par PayPal, le client
 * peut en choisir un autre sans recommencer.
 */
export type ReponseCapture = { ok: true; redirection: string } | (Refus & { relancer?: boolean });

const MESSAGE_ILLISIBLE = "La réponse du serveur est illisible. Réessayez dans un instant.";

function objet(json: unknown): Record<string, unknown> {
  return typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
}

function refus(r: Record<string, unknown>): Refus {
  return { ok: false, message: typeof r.message === "string" && r.message ? r.message : MESSAGE_ILLISIBLE };
}

export function lireReponseSession(json: unknown): ReponseSession {
  const r = objet(json);
  return r.ok === true && typeof r.url === "string" && /^https:\/\//.test(r.url) ? { ok: true, url: r.url } : refus(r);
}

export function lireReponseCommande(json: unknown): ReponseCommande {
  const r = objet(json);
  return r.ok === true && typeof r.id === "string" && r.id !== "" ? { ok: true, id: r.id } : refus(r);
}

export function lireReponseCapture(json: unknown): ReponseCapture {
  const r = objet(json);
  if (r.ok === true && typeof r.redirection === "string" && r.redirection.startsWith("/paiement/merci?")) {
    return { ok: true, redirection: r.redirection };
  }
  return { ...refus(r), ...(r.relancer === true ? { relancer: true } : {}) };
}
