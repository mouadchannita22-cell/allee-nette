/**
 * POST /api/paiement/session : crée la session Stripe Checkout d'un lien de
 * paiement signé, avec le compte Stripe de l'encaisseur (A ou B).
 *
 * Corps JSON : les paramètres signés du lien (lib/encaissement/api.ts),
 * revérifiés ici (lib/encaissement/requete.ts). Réponse : `{ ok: true, url }`
 * (page de paiement Stripe), ou `{ ok: false, message }` avec nos contacts.
 * Jamais mise en cache ; rien n'est conservé.
 */
import { phraseContacts } from "@/lib/contact";
import type { ReponseSession } from "@/lib/encaissement/api";
import { lireDemandePaiement, refuser, repondre } from "@/lib/encaissement/requete";
import {
  clientStripe,
  configurationStripe,
  creerSessionCheckout,
  descriptionErreur,
  motifIndisponible,
} from "@/lib/encaissement/stripe";
import type { MemoireDebit } from "@/lib/reservation/anti-spam";

/** Demandes récentes par adresse IP, en mémoire de l'instance (10 minutes au plus). */
const memoireDebit: MemoireDebit = new Map();

export async function POST(request: Request): Promise<Response> {
  const maintenant = new Date();

  const demande = await lireDemandePaiement(request, memoireDebit, maintenant);
  if (!demande.ok) return demande.reponse;
  const { lien } = demande;

  const config = configurationStripe(lien.encaisseur);
  if (config.etat !== "prete") {
    console.error(`[paiement] Paiement en ligne indisponible : ${lien.ref} (${motifIndisponible(lien.encaisseur, config)})`);
    return refuser(
      503,
      `Le paiement en ligne n'est pas encore disponible. ${phraseContacts()} Vous pouvez aussi régler sur place après la prestation.`,
    );
  }

  try {
    const session = await creerSessionCheckout(clientStripe(lien.encaisseur, config.cle), lien, maintenant);
    console.info(`[paiement] Session Checkout ${session.id} : ${lien.ref} · encaisseur ${lien.encaisseur} · mode ${config.mode}`);
    const corps: ReponseSession = { ok: true, url: session.url };
    return repondre(corps);
  } catch (erreur) {
    console.error(
      `[paiement] Session Checkout impossible : ${lien.ref} · encaisseur ${lien.encaisseur} (${descriptionErreur(erreur)})`,
    );
    return refuser(502, `Le paiement n'a pas pu démarrer. Réessayez dans un instant. ${phraseContacts()}`);
  }
}
