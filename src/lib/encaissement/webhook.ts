/**
 * Webhooks Stripe (partie 10.4 du brief), un par compte : chaque encaisseur
 * déclare l'adresse /api/stripe/webhook/A ou /api/stripe/webhook/B dans son
 * tableau de bord Stripe, avec sa clé de signature (STRIPE_WEBHOOK_SECRET_A
 * ou STRIPE_WEBHOOK_SECRET_B). Les webhooks sont obligatoires : c'est par
 * eux que l'associé apprend qu'un client a payé.
 *
 * - Signature vérifiée sur le corps brut, sinon 400.
 * - checkout.session.completed (si payment_status vaut « paid ») et
 *   checkout.session.async_payment_succeeded : e-mail « paiement reçu ».
 * - checkout.session.async_payment_failed : e-mail d'alerte.
 * - Autres événements : 200 sans action.
 * - E-mail non envoyé : 500, pour que Stripe réessaie (journal sans donnée
 *   personnelle).
 *
 * Toutes les dépendances sont injectées : les tests n'appellent ni Stripe
 * ni Resend.
 */
import "server-only";
import type Stripe from "stripe";
import type { Encaisseur } from "@/config/site";
import { FORMAT_REFERENCE } from "@/lib/reservation/api";
import type { Courriel } from "@/lib/reservation/emails";
import { courrielPaiementEchoue, courrielPaiementRecu, type PaiementNotifie } from "./emails";
import type { StatutEnvoi } from "./envoi";
import { libelleMoyen } from "./libelles";
import { descriptionErreur, type ClientStripe } from "./stripe";

export type DependancesWebhook = {
  /** Clé de signature du webhook de cet encaisseur (whsec_…). */
  secret: string | undefined;
  /** Vérification de la signature (stripe.webhooks). */
  webhooks: Pick<Stripe["webhooks"], "constructEventAsync">;
  /** Client Stripe de l'encaisseur, pour lire le moyen de paiement ; `null` sans clé. */
  client: ClientStripe | null;
  envoyer: (courriel: Courriel, idempotence: string) => Promise<StatutEnvoi>;
};

export type ResultatWebhook = { statut: 200 | 400 | 500 | 503; message: string };

/** Moyen de paiement d'un PaymentIntent lu avec `latest_charge` : type, et portefeuille Apple Pay ou Google Pay. */
export function moyenDuPaiement(intent: Pick<Stripe.PaymentIntent, "latest_charge" | "payment_method_types">): string {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const details = charge?.payment_method_details;
  const types = intent.payment_method_types ?? [];
  const type = details?.type ?? (types.length === 1 ? types[0] : null);
  return libelleMoyen(type, type === "card" ? details?.card?.wallet?.type : null);
}

/** Moyen de paiement d'une session, récupéré sur son PaymentIntent. Ne lève jamais d'erreur. */
export async function moyenDeSession(
  session: Pick<Stripe.Checkout.Session, "id" | "payment_intent">,
  client: ClientStripe | null,
): Promise<string> {
  const intent = session.payment_intent;
  if (intent && typeof intent === "object") return moyenDuPaiement(intent);
  if (!intent || !client) return libelleMoyen(null);
  try {
    return moyenDuPaiement(await client.paymentIntents.retrieve(intent, { expand: ["latest_charge"] }));
  } catch (erreur) {
    console.error(`[paiement] Moyen de paiement illisible pour la session ${session.id} (${descriptionErreur(erreur)})`);
    return libelleMoyen(null);
  }
}

async function notifier(
  type: "recu" | "echoue",
  evenement: Stripe.Event,
  session: Stripe.Checkout.Session,
  encaisseur: Encaisseur,
  deps: DependancesWebhook,
): Promise<ResultatWebhook> {
  const reference = session.metadata?.reference;
  if (!reference || !FORMAT_REFERENCE.test(reference)) {
    console.info(`[paiement] Webhook ${encaisseur} : session ${session.id} sans référence Allée Nette, ignorée`);
    return { statut: 200, message: "Session sans référence : ignorée." };
  }
  if (session.metadata?.encaisseur !== encaisseur) {
    console.error(`[paiement] Webhook ${encaisseur} : la session ${session.id} (${reference}) indique un autre encaisseur`);
  }

  const paiement: PaiementNotifie = {
    reference,
    encaisseur,
    centimes: session.amount_total,
    devise: session.currency ?? "eur",
    moyen: await moyenDeSession(session, deps.client),
    date: new Date(evenement.created * 1000),
    prestataire: "Stripe",
    identifiant: session.id,
    test: !evenement.livemode,
  };
  const courriel = type === "recu" ? courrielPaiementRecu(paiement) : courrielPaiementEchoue(paiement);
  const envoi = await deps.envoyer(courriel, `paiement-${type}/${session.id}`);
  if (envoi === "envoye" || envoi === "demo") {
    console.info(`[paiement] Webhook ${encaisseur} : ${evenement.type} · ${reference} · e-mail ${envoi === "demo" ? "en démonstration" : "envoyé"}`);
    return { statut: 200, message: "Paiement signalé à l'associé." };
  }
  console.error(`[paiement] Webhook ${encaisseur} : e-mail non envoyé (${envoi}) pour ${reference}, Stripe réessaiera`);
  return { statut: 500, message: "E-mail non envoyé : Stripe réessaiera." };
}

/** Traite un événement reçu par /api/stripe/webhook/[encaisseur]. Ne lève jamais d'erreur. */
export async function traiterWebhook(
  encaisseur: Encaisseur,
  corps: string,
  signature: string | null,
  deps: DependancesWebhook,
): Promise<ResultatWebhook> {
  const secret = deps.secret?.trim();
  if (!secret) {
    console.error(`[paiement] STRIPE_WEBHOOK_SECRET_${encaisseur} absente : événement refusé, Stripe réessaiera`);
    return { statut: 503, message: "Webhook non configuré." };
  }
  if (!signature) return { statut: 400, message: "Signature absente." };

  let evenement: Stripe.Event;
  try {
    evenement = await deps.webhooks.constructEventAsync(corps, signature, secret);
  } catch {
    console.error(`[paiement] Webhook ${encaisseur} : signature invalide, événement refusé`);
    return { statut: 400, message: "Signature invalide." };
  }

  switch (evenement.type) {
    case "checkout.session.completed": {
      const session = evenement.data.object;
      // Moyen différé (prélèvement…) : le paiement n'est pas encore reçu, async_payment_succeeded suivra.
      if (session.payment_status !== "paid") return { statut: 200, message: "Paiement en attente : rien à signaler." };
      return notifier("recu", evenement, session, encaisseur, deps);
    }
    case "checkout.session.async_payment_succeeded":
      return notifier("recu", evenement, evenement.data.object, encaisseur, deps);
    case "checkout.session.async_payment_failed":
      return notifier("echoue", evenement, evenement.data.object, encaisseur, deps);
    default:
      return { statut: 200, message: "Événement ignoré." };
  }
}
