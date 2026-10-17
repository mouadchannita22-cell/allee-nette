/**
 * POST /api/paiement/paypal/commande : crée la commande PayPal (API Orders
 * v2, intention CAPTURE) d'un lien de paiement signé, avec le compte PayPal
 * de l'encaisseur. Appelée par le SDK PayPal, après un clic du client.
 *
 * Corps JSON : les paramètres signés du lien, revérifiés ici. Réponse :
 * `{ ok: true, id }` ou `{ ok: false, message }`. Jamais mise en cache.
 */
import { phraseContacts } from "@/lib/contact";
import type { ReponseCommande } from "@/lib/encaissement/api";
import { ErreurPayPal, configurationPayPal, creerCommandePayPal, descriptionErreurPayPal } from "@/lib/encaissement/paypal";
import { lireDemandePaiement, refuser, repondre } from "@/lib/encaissement/requete";
import type { MemoireDebit } from "@/lib/reservation/anti-spam";

/** Demandes récentes par adresse IP, en mémoire de l'instance (10 minutes au plus). */
const memoireDebit: MemoireDebit = new Map();

export async function POST(request: Request): Promise<Response> {
  const maintenant = new Date();

  const demande = await lireDemandePaiement(request, memoireDebit, maintenant);
  if (!demande.ok) return demande.reponse;
  const { lien } = demande;

  const config = configurationPayPal(lien.encaisseur);
  if (config.etat !== "pret") {
    console.error(`[paiement] PayPal indisponible pour l'encaisseur ${lien.encaisseur} (${config.etat}) : ${lien.ref}`);
    return refuser(503, `Le paiement avec PayPal n'est pas disponible. ${phraseContacts()}`);
  }

  try {
    const id = await creerCommandePayPal(config, lien, maintenant);
    console.info(`[paiement] Commande PayPal ${id} : ${lien.ref} · encaisseur ${lien.encaisseur} · ${config.environnement}`);
    const corps: ReponseCommande = { ok: true, id };
    return repondre(corps);
  } catch (erreur) {
    console.error(`[paiement] Commande PayPal impossible : ${lien.ref} (${descriptionErreurPayPal(erreur)})`);
    if (erreur instanceof ErreurPayPal && erreur.code === "DUPLICATE_INVOICE_ID") {
      return refuser(409, `Cette prestation semble déjà réglée avec PayPal. ${phraseContacts()}`);
    }
    return refuser(502, `PayPal ne répond pas pour le moment. Réessayez dans un instant. ${phraseContacts()}`);
  }
}
