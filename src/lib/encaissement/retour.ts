/**
 * Retour sur /paiement/merci : état réel du paiement, lu côté serveur chez
 * Stripe (session Checkout) ou chez PayPal (commande), quand c'est possible.
 * Sinon, la page affiche un texte générique. L'adresse de retour n'est
 * jamais crue sur parole : la session doit porter la même référence et le
 * même encaisseur.
 */
import "server-only";
import type Stripe from "stripe";
import type { Encaisseur } from "@/config/site";
import { estEncaisseur } from "@/lib/paiement";
import { FORMAT_REFERENCE } from "@/lib/reservation/api";
import { FORMAT_COMMANDE, configurationPayPal, lireCommandePayPal, type EtatCommande } from "./paypal";
import { clientStripe, configurationStripe, descriptionErreur, type ClientStripe } from "./stripe";

export type EtatPaiement =
  | { statut: "paye"; reference: string; centimes: number | null; moyen: "stripe" | "paypal"; identifiant: string }
  | { statut: "en-cours"; reference: string; centimes: number | null }
  | { statut: "non-paye"; reference: string }
  /** Rien à vérifier (ou vérification impossible) : texte générique. */
  | { statut: "inconnu"; reference: string | null };

/** Identifiant de session Checkout (« cs_test_… »). */
export const FORMAT_SESSION = /^cs_(?:test|live)_[A-Za-z0-9]{10,200}$/;

/** État d'une session Checkout, si elle correspond bien à la référence et à l'encaisseur de l'adresse. */
export function etatSessionCheckout(
  session: Pick<Stripe.Checkout.Session, "id" | "status" | "payment_status" | "amount_total" | "currency" | "metadata">,
  reference: string,
  encaisseur: Encaisseur,
): EtatPaiement {
  if (session.metadata?.reference !== reference || session.metadata?.encaisseur !== encaisseur) {
    return { statut: "inconnu", reference: null };
  }
  const centimes = session.currency === "eur" ? session.amount_total : null;
  if (session.status === "complete") {
    return session.payment_status === "paid" || session.payment_status === "no_payment_required"
      ? { statut: "paye", reference, centimes, moyen: "stripe", identifiant: session.id }
      : { statut: "en-cours", reference, centimes };
  }
  return { statut: "non-paye", reference };
}

/** État d'une commande PayPal relue côté serveur. */
export function etatCommandeRetour(etat: EtatCommande, reference: string, commande: string): EtatPaiement {
  switch (etat.statut) {
    case "paye":
      return { statut: "paye", reference, centimes: etat.centimes, moyen: "paypal", identifiant: commande };
    case "en-cours":
      return { statut: "en-cours", reference, centimes: etat.centimes };
    case "etrangere":
      return { statut: "inconnu", reference: null };
    default:
      return { statut: "non-paye", reference };
  }
}

export type DependancesRetour = {
  /** Client Stripe de l'encaisseur, ou `null` sans clé utilisable. */
  stripe: (encaisseur: Encaisseur) => ClientStripe | null;
  /** Lecture d'une commande PayPal, ou `null` si PayPal n'est pas prêt pour cet encaisseur. */
  paypal: (encaisseur: Encaisseur, commande: string, reference: string) => Promise<EtatCommande> | null;
};

const dependancesParDefaut: DependancesRetour = {
  stripe: (encaisseur) => {
    const config = configurationStripe(encaisseur);
    return config.etat === "prete" ? clientStripe(encaisseur, config.cle) : null;
  },
  paypal: (encaisseur, commande, reference) => {
    const config = configurationPayPal(encaisseur);
    return config.etat === "pret" ? lireCommandePayPal(config, commande, reference) : null;
  },
};

type Parametres = Readonly<Record<string, string | string[] | undefined>>;

/** Lit l'adresse de retour (ref, encaisseur, session_id ou paypal) et vérifie l'état du paiement. Ne lève jamais d'erreur. */
export async function etatPaiementRetour(
  params: Parametres,
  dependances: DependancesRetour = dependancesParDefaut,
): Promise<EtatPaiement> {
  const reference = typeof params.ref === "string" && FORMAT_REFERENCE.test(params.ref) ? params.ref : null;
  const encaisseur = params.encaisseur;
  if (!reference || !estEncaisseur(encaisseur)) return { statut: "inconnu", reference };

  const session = params.session_id;
  if (typeof session === "string" && FORMAT_SESSION.test(session)) {
    const client = dependances.stripe(encaisseur);
    if (!client) return { statut: "inconnu", reference };
    try {
      return etatSessionCheckout(await client.checkout.sessions.retrieve(session), reference, encaisseur);
    } catch (erreur) {
      console.error(`[paiement] Session ${session} illisible au retour (${descriptionErreur(erreur)})`);
      return { statut: "inconnu", reference };
    }
  }

  const commande = params.paypal;
  if (typeof commande === "string" && FORMAT_COMMANDE.test(commande)) {
    const lecture = dependances.paypal(encaisseur, commande, reference);
    if (!lecture) return { statut: "inconnu", reference };
    try {
      return etatCommandeRetour(await lecture, reference, commande);
    } catch (erreur) {
      console.error(`[paiement] Commande PayPal ${commande} illisible au retour (${erreur instanceof Error ? erreur.message : "erreur"})`);
      return { statut: "inconnu", reference };
    }
  }
  return { statut: "inconnu", reference };
}
