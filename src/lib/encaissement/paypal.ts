/**
 * PayPal en secours (partie 10.3 du brief), côté serveur uniquement :
 * commande et capture avec l'API Orders v2. Sert si PayPal n'est pas
 * activable dans Stripe pour nos comptes.
 *
 * Variables d'environnement, lues à l'exécution :
 * - PAYPAL_ENABLED : « true » pour afficher le bouton PayPal ;
 * - PAYPAL_ENV : « sandbox » (bac à sable, par défaut) ou « live » ;
 * - PAYPAL_CLIENT_ID_A, PAYPAL_CLIENT_ID_B : identifiants publics, transmis
 *   au navigateur pour charger le SDK JavaScript de PayPal ;
 * - PAYPAL_CLIENT_SECRET_A, PAYPAL_CLIENT_SECRET_B : serveur uniquement.
 *
 * Comme pour Stripe, PayPal en mode réel est refusé hors production. Le
 * montant vient toujours du lien vérifié ; avant de capturer, le serveur
 * relit la commande et vérifie le montant et la référence.
 *
 * Les appels réseau passent par `fetch`, remplaçable dans les tests.
 */
import "server-only";
import { site, type Encaisseur } from "@/config/site";
import { enProduction } from "@/lib/environnement";
import { montantPourUrl, normaliserMontant } from "@/lib/montant";
import type { LienPaiement } from "@/lib/paiement";
import { libelleLigne } from "./libelles";

export type EnvironnementPayPal = "sandbox" | "live";

export type ConfigurationPayPal =
  /** PAYPAL_ENABLED n'est pas « true » : aucun bouton PayPal. */
  | { etat: "desactive" }
  /** Identifiant ou secret de l'encaisseur absent, ou PAYPAL_ENV inconnu. */
  | { etat: "incomplete" }
  | { etat: "reel-hors-production" }
  | { etat: "pret"; environnement: EnvironnementPayPal; clientId: string; secret: string };

/** Lit la configuration PayPal (fonction pure). */
export function lireConfigurationPayPal(
  variables: { active?: string; environnement?: string; clientId?: string; secret?: string },
  production: boolean,
): ConfigurationPayPal {
  if (variables.active?.trim().toLowerCase() !== "true") return { etat: "desactive" };
  const env = variables.environnement?.trim().toLowerCase() || "sandbox";
  const clientId = variables.clientId?.trim() ?? "";
  const secret = variables.secret?.trim() ?? "";
  if ((env !== "sandbox" && env !== "live") || clientId === "" || secret === "") return { etat: "incomplete" };
  if (env === "live" && !production) return { etat: "reel-hors-production" };
  return { etat: "pret", environnement: env, clientId, secret };
}

/** Configuration PayPal d'un encaisseur, lue dans l'environnement au moment de l'appel. */
export function configurationPayPal(encaisseur: Encaisseur): ConfigurationPayPal {
  return lireConfigurationPayPal(
    {
      active: process.env.PAYPAL_ENABLED,
      environnement: process.env.PAYPAL_ENV,
      // Noms écrits en toutes lettres : aucune variable n'est construite dynamiquement.
      clientId: encaisseur === "A" ? process.env.PAYPAL_CLIENT_ID_A : process.env.PAYPAL_CLIENT_ID_B,
      secret: encaisseur === "A" ? process.env.PAYPAL_CLIENT_SECRET_A : process.env.PAYPAL_CLIENT_SECRET_B,
    },
    enProduction(),
  );
}

const API: Record<EnvironnementPayPal, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

/** Identifiant de commande PayPal (« 5O190127TN364715T ») : rien d'autre n'entre dans une adresse d'API. */
export const FORMAT_COMMANDE = /^[A-Z0-9]{8,40}$/;

/** Montant PayPal : « 119.50 », toujours avec deux décimales. */
export function montantPayPal(centimes: number): string {
  const texte = montantPourUrl(centimes);
  return texte.includes(".") ? texte : `${texte}.00`;
}

/** Erreur d'un appel à PayPal : étape, statut HTTP et code d'erreur PayPal, sans secret. */
export class ErreurPayPal extends Error {
  override name = "ErreurPayPal";
  constructor(
    readonly etape: "jeton" | "commande" | "lecture" | "capture",
    readonly statut: number,
    readonly code: string | null = null,
  ) {
    super(`PayPal ${etape} : ${statut}${code ? `, ${code}` : ""}`);
  }
}

type Fetch = typeof fetch;

const DELAI_MS = 15_000;

/** Code d'erreur PayPal (« INSTRUMENT_DECLINED »), lu sans faire confiance à la forme de la réponse. */
function codeErreur(json: unknown): string | null {
  const r = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  const details = Array.isArray(r.details) ? (r.details[0] as Record<string, unknown> | undefined) : undefined;
  const code = details?.issue ?? r.name ?? r.error;
  return typeof code === "string" ? code : null;
}

async function lireJson(reponse: Response): Promise<unknown> {
  try {
    return await reponse.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Jeton d'accès
// ---------------------------------------------------------------------------

/** Jetons en mémoire de l'instance, par environnement et identifiant. */
const jetons = new Map<string, { jeton: string; expireA: number }>();

export async function jetonPayPal(
  config: Extract<ConfigurationPayPal, { etat: "pret" }>,
  fetcher: Fetch = fetch,
  maintenant = Date.now(),
): Promise<string> {
  const cle = `${config.environnement}:${config.clientId}`;
  const existant = jetons.get(cle);
  if (existant && existant.expireA > maintenant + 60_000) return existant.jeton;

  const reponse = await fetcher(`${API[config.environnement]}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(DELAI_MS),
  });
  const json = (await lireJson(reponse)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!reponse.ok || typeof json?.access_token !== "string") {
    throw new ErreurPayPal("jeton", reponse.status, codeErreur(json));
  }
  const duree = typeof json.expires_in === "number" ? json.expires_in : 300;
  jetons.set(cle, { jeton: json.access_token, expireA: maintenant + duree * 1000 });
  return json.access_token;
}

async function appeler(
  config: Extract<ConfigurationPayPal, { etat: "pret" }>,
  etape: ErreurPayPal["etape"],
  chemin: string,
  options: { methode: "GET" | "POST"; corps?: unknown; idempotence?: string },
  fetcher: Fetch,
): Promise<unknown> {
  const jeton = await jetonPayPal(config, fetcher);
  const reponse = await fetcher(`${API[config.environnement]}${chemin}`, {
    method: options.methode,
    headers: {
      Authorization: `Bearer ${jeton}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.idempotence ? { "PayPal-Request-Id": options.idempotence } : {}),
    },
    ...(options.corps === undefined ? {} : { body: JSON.stringify(options.corps) }),
    signal: AbortSignal.timeout(DELAI_MS),
  });
  const json = await lireJson(reponse);
  if (!reponse.ok) throw new ErreurPayPal(etape, reponse.status, codeErreur(json));
  return json;
}

// ---------------------------------------------------------------------------
// Commande
// ---------------------------------------------------------------------------

/** Corps exact de la commande : intention CAPTURE, montant du lien vérifié, référence en custom_id et invoice_id. */
export function corpsCommande(lien: LienPaiement) {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: lien.ref,
        custom_id: lien.ref,
        // Unique par compte PayPal : un lien déjà réglé ne peut pas l'être deux fois.
        invoice_id: lien.ref,
        description: libelleLigne(lien),
        amount: { currency_code: "EUR", value: montantPayPal(lien.centimes) },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: site.nom,
          locale: "fr-FR",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      },
    },
  } as const;
}

/** Crée la commande et renvoie son identifiant (rendu au SDK PayPal du navigateur). */
export async function creerCommandePayPal(
  config: Extract<ConfigurationPayPal, { etat: "pret" }>,
  lien: LienPaiement,
  maintenant: Date,
  fetcher: Fetch = fetch,
): Promise<string> {
  const json = (await appeler(
    config,
    "commande",
    "/v2/checkout/orders",
    {
      methode: "POST",
      corps: corpsCommande(lien),
      // Double clic : la même commande, pas deux.
      idempotence: `allee-nette-commande-${lien.sig}-${Math.floor(maintenant.getTime() / 60_000)}`,
    },
    fetcher,
  )) as { id?: unknown } | null;
  if (typeof json?.id !== "string" || !FORMAT_COMMANDE.test(json.id)) throw new ErreurPayPal("commande", 200, "REPONSE_ILLISIBLE");
  return json.id;
}

// ---------------------------------------------------------------------------
// Lecture et capture
// ---------------------------------------------------------------------------

export type EtatCommande =
  /** Capturée : l'argent est encaissé. */
  | { statut: "paye"; captureId: string; centimes: number | null; date: Date }
  /** Capture en attente chez PayPal (vérification, paiement différé). */
  | { statut: "en-cours"; captureId: string; centimes: number | null }
  /** Approuvée par le client, pas encore capturée. */
  | { statut: "approuvee"; centimes: number | null }
  /** Créée, abandonnée ou refusée. */
  | { statut: "non-paye" }
  /** Référence différente de celle attendue : commande étrangère à ce lien. */
  | { statut: "etrangere" };

type MontantPayPal = { currency_code?: unknown; value?: unknown };

function centimesDe(montant: MontantPayPal | undefined): number | null {
  if (montant?.currency_code !== "EUR" || typeof montant.value !== "string") return null;
  return normaliserMontant(montant.value);
}

/** Lit l'état d'une commande PayPal (réponse de lecture ou de capture), sans faire confiance à sa forme. */
export function etatCommande(json: unknown, reference: string): EtatCommande {
  const commande = (typeof json === "object" && json !== null ? json : {}) as {
    status?: unknown;
    purchase_units?: {
      custom_id?: unknown;
      amount?: MontantPayPal;
      payments?: { captures?: { id?: unknown; status?: unknown; custom_id?: unknown; amount?: MontantPayPal; create_time?: unknown }[] };
    }[];
  };
  const unite = Array.isArray(commande.purchase_units) ? commande.purchase_units[0] : undefined;
  if (!unite) return { statut: "non-paye" };
  const capture = Array.isArray(unite.payments?.captures) ? unite.payments.captures[0] : undefined;
  if ((capture?.custom_id ?? unite.custom_id) !== reference) return { statut: "etrangere" };

  if (capture && typeof capture.id === "string") {
    const centimes = centimesDe(capture.amount);
    if (commande.status === "COMPLETED" && capture.status === "COMPLETED") {
      const date = typeof capture.create_time === "string" ? new Date(capture.create_time) : new Date();
      return { statut: "paye", captureId: capture.id, centimes, date: Number.isNaN(date.getTime()) ? new Date() : date };
    }
    if (capture.status === "PENDING") return { statut: "en-cours", captureId: capture.id, centimes };
    return { statut: "non-paye" };
  }
  if (commande.status === "APPROVED") return { statut: "approuvee", centimes: centimesDe(unite.amount) };
  return { statut: "non-paye" };
}

/** Lit une commande (page de remerciement, vérification avant capture). */
export async function lireCommandePayPal(
  config: Extract<ConfigurationPayPal, { etat: "pret" }>,
  id: string,
  reference: string,
  fetcher: Fetch = fetch,
): Promise<EtatCommande> {
  if (!FORMAT_COMMANDE.test(id)) return { statut: "etrangere" };
  return etatCommande(await appeler(config, "lecture", `/v2/checkout/orders/${id}`, { methode: "GET" }, fetcher), reference);
}

export type ResultatCapture =
  | Extract<EtatCommande, { statut: "paye" | "en-cours" }>
  /** Moyen de paiement refusé par PayPal : le client peut en choisir un autre. */
  | { statut: "instrument-refuse" }
  /** Cette référence a déjà été réglée avec PayPal (invoice_id unique). */
  | { statut: "deja-regle" }
  /** Commande qui ne correspond pas au lien (montant, référence) : jamais capturée. */
  | { statut: "incoherente" }
  | { statut: "non-paye" };

/**
 * Capture une commande approuvée, après avoir vérifié qu'elle correspond au
 * lien (même référence, même montant). Lève `ErreurPayPal` si PayPal ne
 * répond pas comme prévu.
 */
export async function capturerCommandePayPal(
  config: Extract<ConfigurationPayPal, { etat: "pret" }>,
  lien: LienPaiement,
  id: string,
  fetcher: Fetch = fetch,
): Promise<ResultatCapture> {
  const avant = await lireCommandePayPal(config, id, lien.ref, fetcher);
  if (avant.statut === "etrangere") return { statut: "incoherente" };
  if (avant.statut === "paye" || avant.statut === "en-cours") {
    // Déjà capturée (double envoi) : rien à refaire, si le montant est le bon.
    return avant.centimes === lien.centimes ? avant : { statut: "incoherente" };
  }
  if (avant.statut !== "approuvee") return { statut: "non-paye" };
  if (avant.centimes !== lien.centimes) return { statut: "incoherente" };

  let json: unknown;
  try {
    json = await appeler(
      config,
      "capture",
      `/v2/checkout/orders/${id}/capture`,
      { methode: "POST", idempotence: `allee-nette-capture-${id}` },
      fetcher,
    );
  } catch (erreur) {
    if (erreur instanceof ErreurPayPal && erreur.code === "INSTRUMENT_DECLINED") return { statut: "instrument-refuse" };
    if (erreur instanceof ErreurPayPal && erreur.code === "DUPLICATE_INVOICE_ID") return { statut: "deja-regle" };
    throw erreur;
  }
  const apres = etatCommande(json, lien.ref);
  if (apres.statut === "paye" || apres.statut === "en-cours") {
    return apres.centimes === lien.centimes ? apres : { statut: "incoherente" };
  }
  return apres.statut === "etrangere" ? { statut: "incoherente" } : { statut: "non-paye" };
}

/** Description d'une erreur PayPal pour les journaux (jamais de secret ni de jeton). */
export function descriptionErreurPayPal(erreur: unknown): string {
  if (erreur instanceof ErreurPayPal) return erreur.message;
  return erreur instanceof Error ? erreur.name : "erreur inconnue";
}
