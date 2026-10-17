/**
 * POST /api/stripe/webhook/[encaisseur] : événements Stripe du compte de
 * l'associé A (/api/stripe/webhook/A) ou B (/api/stripe/webhook/B).
 *
 * Corps brut (request.text()), signature vérifiée avec
 * STRIPE_WEBHOOK_SECRET_A ou STRIPE_WEBHOOK_SECRET_B : la logique vit dans
 * lib/encaissement/webhook.ts. Réponse rapide et jamais mise en cache.
 */
import Stripe from "stripe";
import { estEncaisseur } from "@/lib/paiement";
import { envoyerCourrielPaiement } from "@/lib/encaissement/envoi";
import { clientStripe, configurationStripe } from "@/lib/encaissement/stripe";
import { traiterWebhook } from "@/lib/encaissement/webhook";

/** Un événement Stripe pèse quelques kilo-octets. */
const TAILLE_MAX = 1_000_000;

function repondre(statut: number, message: string): Response {
  return Response.json({ recu: statut === 200, message }, { status: statut, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, contexte: RouteContext<"/api/stripe/webhook/[encaisseur]">): Promise<Response> {
  const { encaisseur } = await contexte.params;
  if (!estEncaisseur(encaisseur)) return repondre(404, "Encaisseur inconnu : A ou B.");

  const longueur = Number(request.headers.get("content-length"));
  if (Number.isFinite(longueur) && longueur > TAILLE_MAX) return repondre(413, "Événement trop volumineux.");
  const corps = await request.text();
  if (corps.length > TAILLE_MAX) return repondre(413, "Événement trop volumineux.");

  const config = configurationStripe(encaisseur);
  const resultat = await traiterWebhook(encaisseur, corps, request.headers.get("stripe-signature"), {
    // Noms écrits en toutes lettres : aucune variable n'est construite dynamiquement.
    secret: encaisseur === "A" ? process.env.STRIPE_WEBHOOK_SECRET_A : process.env.STRIPE_WEBHOOK_SECRET_B,
    webhooks: Stripe.webhooks,
    client: config.etat === "prete" ? clientStripe(encaisseur, config.cle) : null,
    envoyer: (courriel, idempotence) => envoyerCourrielPaiement(encaisseur, courriel, idempotence),
  });
  return repondre(resultat.statut, resultat.message);
}
