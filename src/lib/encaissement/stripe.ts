/**
 * Stripe Checkout, côté serveur uniquement (partie 10.3 du brief).
 *
 * Deux micro-entreprises, deux comptes Stripe : chaque encaisseur a sa clé,
 * lue à l'exécution (jamais recopiée au build ni envoyée au navigateur) :
 * - STRIPE_API_KEY_A, STRIPE_API_KEY_B : clés restreintes recommandées
 *   (rk_test_… puis rk_live_…), avec le minimum de droits (docs/paiement.md) ;
 *   les clés secrètes sk_… restent acceptées.
 *
 * Règles :
 * - clé absente : le bouton de paiement est remplacé par « Paiement en
 *   ligne bientôt disponible » ;
 * - clé de test : bandeau « Mode test : aucun débit réel » ;
 * - clé réelle hors production (aperçus Netlify, local) : refusée, pour ne
 *   jamais encaisser depuis une version d'essai du site ;
 * - une clé n'apparaît jamais dans un journal ni dans un message d'erreur.
 *
 * Moyens de paiement dynamiques : jamais de `payment_method_types`. Cartes,
 * Apple Pay, Google Pay et PayPal s'activent dans le tableau de bord Stripe.
 */
import "server-only";
import Stripe from "stripe";
import { site, type Encaisseur } from "@/config/site";
import { enProduction } from "@/lib/environnement";
import type { LienPaiement } from "@/lib/paiement";

export type ModeStripe = "test" | "reel";

export type ConfigurationStripe =
  | { etat: "absente" }
  /** La valeur ne ressemble pas à une clé secrète ou restreinte (clé publiable pk_… collée par erreur…). */
  | { etat: "illisible" }
  /** Clé réelle (sk_live_, rk_live_) hors du site de production : refusée. */
  | { etat: "reel-hors-production" }
  | { etat: "prete"; cle: string; mode: ModeStripe };

/** Clé secrète (sk_) ou restreinte (rk_), de test ou réelle. */
const FORMAT_CLE = /^(?:sk|rk)_(test|live)_\w+$/;

/** Lit une clé Stripe (fonction pure). */
export function lireConfigurationStripe(cle: string | undefined, production: boolean): ConfigurationStripe {
  const valeur = cle?.trim() ?? "";
  if (valeur === "") return { etat: "absente" };
  const m = FORMAT_CLE.exec(valeur);
  if (!m) return { etat: "illisible" };
  const mode: ModeStripe = m[1] === "live" ? "reel" : "test";
  if (mode === "reel" && !production) return { etat: "reel-hors-production" };
  return { etat: "prete", cle: valeur, mode };
}

/** Nom de la variable de la clé d'un encaisseur (pour les journaux : jamais sa valeur). */
export function variableCle(encaisseur: Encaisseur): string {
  return `STRIPE_API_KEY_${encaisseur}`;
}

/** Configuration Stripe d'un encaisseur, lue dans l'environnement au moment de l'appel. */
export function configurationStripe(encaisseur: Encaisseur): ConfigurationStripe {
  // Noms écrits en toutes lettres : aucune variable n'est construite dynamiquement.
  const cle = encaisseur === "A" ? process.env.STRIPE_API_KEY_A : process.env.STRIPE_API_KEY_B;
  return lireConfigurationStripe(cle, enProduction());
}

/** Explication d'une configuration inutilisable, pour les journaux du serveur (sans la clé). */
export function motifIndisponible(encaisseur: Encaisseur, config: Exclude<ConfigurationStripe, { etat: "prete" }>): string {
  const variable = variableCle(encaisseur);
  switch (config.etat) {
    case "absente":
      return `${variable} absente`;
    case "illisible":
      return `${variable} illisible : clé secrète (sk_…) ou restreinte (rk_…) attendue`;
    case "reel-hors-production":
      return `${variable} est une clé réelle : refusée hors production`;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Ce que le site utilise du client Stripe (un client simulé suffit dans les tests). */
export type ClientStripe = {
  checkout: { sessions: Pick<Stripe["checkout"]["sessions"], "create" | "retrieve"> };
  paymentIntents: Pick<Stripe["paymentIntents"], "retrieve">;
};

/** Un client par encaisseur, gardé le temps de vie de l'instance du serveur. */
const clients = new Map<Encaisseur, { cle: string; client: Stripe }>();

/** Client Stripe de l'encaisseur, créé côté serveur avec sa propre clé (jamais de client global). */
export function clientStripe(encaisseur: Encaisseur, cle: string): Stripe {
  const existant = clients.get(encaisseur);
  if (existant?.cle === cle) return existant.client;
  const client = new Stripe(cle, {
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: "Allee Nette", url: site.url },
  });
  clients.set(encaisseur, { cle, client });
  return client;
}

/** Description d'une erreur Stripe pour les journaux : type, code et statut, jamais le message (il peut citer la clé). */
export function descriptionErreur(erreur: unknown): string {
  if (typeof erreur !== "object" || erreur === null) return "erreur inconnue";
  const e = erreur as { type?: unknown; code?: unknown; statusCode?: unknown; name?: unknown };
  const parties = [e.type ?? e.name, e.code, e.statusCode].filter((p) => typeof p === "string" || typeof p === "number");
  return parties.length > 0 ? parties.join(", ") : "erreur inconnue";
}

// ---------------------------------------------------------------------------
// Session Checkout
// ---------------------------------------------------------------------------

/**
 * Étiquette constante des sessions créées par les liens signés, pour les
 * retrouver dans le tableau de bord Stripe (8 lettres tirées au hasard une
 * fois pour toutes).
 */
export const IDENTIFIANT_INTEGRATION = "allee-nette-lien-signe-kgttceqo";

/** Ligne de la session : « Allée Nette — Le Complet M — réf. AN-2026-0142 ». */
export function libelleLigne(lien: Pick<LienPaiement, "libelle" | "ref">): string {
  return `${site.nom} — ${lien.libelle} — réf. ${lien.ref}`;
}

/** Page de remerciement. `{CHECKOUT_SESSION_ID}` est remplacé par Stripe : il reste tel quel, non encodé. */
export function urlRetourSucces(lien: Pick<LienPaiement, "ref" | "encaisseur">, origine = site.url): string {
  return `${origine}/paiement/merci?ref=${lien.ref}&encaisseur=${lien.encaisseur}&session_id={CHECKOUT_SESSION_ID}`;
}

/** Paramètres exacts de la session Checkout d'un lien vérifié. */
export function parametresSessionCheckout(lien: LienPaiement, origine = site.url): Stripe.Checkout.SessionCreateParams {
  const metadata = { reference: lien.ref, encaisseur: lien.encaisseur };
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: lien.centimes, product_data: { name: libelleLigne(lien) } },
      },
    ],
    metadata,
    payment_intent_data: { metadata, description: libelleLigne(lien) },
    client_reference_id: lien.ref,
    locale: "fr",
    success_url: urlRetourSucces(lien, origine),
    // Abandon : retour au lien de paiement d'origine, toujours signé.
    cancel_url: `${origine}${lien.chemin}`,
    integration_identifier: IDENTIFIANT_INTEGRATION,
  };
}

/**
 * Clé d'idempotence : la signature du lien et la minute en cours. Un double
 * clic renvoie la même session au lieu d'en créer deux.
 */
export function cleIdempotence(lien: Pick<LienPaiement, "sig">, maintenant: Date): string {
  return `allee-nette/checkout/${lien.sig}/${Math.floor(maintenant.getTime() / 60_000)}`;
}

/** Crée la session Checkout et renvoie l'adresse de la page de paiement Stripe. */
export async function creerSessionCheckout(
  client: ClientStripe,
  lien: LienPaiement,
  maintenant: Date,
): Promise<{ id: string; url: string }> {
  const session = await client.checkout.sessions.create(parametresSessionCheckout(lien), {
    idempotencyKey: cleIdempotence(lien, maintenant),
  });
  if (!session.url) throw new TypeError("Session Checkout sans adresse de paiement");
  return { id: session.id, url: session.url };
}
