/**
 * POST /api/paiement/paypal/capture : capture la commande PayPal approuvée
 * par le client, puis prévient l'associé qui encaisse par e-mail.
 *
 * Corps JSON : les paramètres signés du lien (revérifiés ici) et
 * `commande`, l'identifiant de la commande PayPal. Avant de capturer, le
 * serveur relit la commande : même référence et même montant que le lien,
 * sinon rien n'est capturé.
 *
 * Réponse : `{ ok: true, redirection }` vers la page de remerciement, ou
 * `{ ok: false, message, relancer? }`. Jamais mise en cache.
 */
import { phraseContacts } from "@/lib/contact";
import type { ReponseCapture } from "@/lib/encaissement/api";
import { courrielPaiementRecu } from "@/lib/encaissement/emails";
import { envoyerCourrielPaiement } from "@/lib/encaissement/envoi";
import {
  FORMAT_COMMANDE,
  capturerCommandePayPal,
  configurationPayPal,
  descriptionErreurPayPal,
} from "@/lib/encaissement/paypal";
import { lireDemandePaiement, refuser, repondre } from "@/lib/encaissement/requete";
import type { MemoireDebit } from "@/lib/reservation/anti-spam";

/** Demandes récentes par adresse IP, en mémoire de l'instance (10 minutes au plus). */
const memoireDebit: MemoireDebit = new Map();

export async function POST(request: Request): Promise<Response> {
  const maintenant = new Date();

  const demande = await lireDemandePaiement(request, memoireDebit, maintenant);
  if (!demande.ok) return demande.reponse;
  const { lien, json } = demande;

  const commande = typeof json.commande === "string" ? json.commande : "";
  if (!FORMAT_COMMANDE.test(commande)) return refuser(400, "Commande PayPal illisible : rechargez la page, puis réessayez.");

  const config = configurationPayPal(lien.encaisseur);
  if (config.etat !== "pret") {
    console.error(`[paiement] PayPal indisponible pour l'encaisseur ${lien.encaisseur} (${config.etat}) : ${lien.ref}`);
    return refuser(503, `Le paiement avec PayPal n'est pas disponible. ${phraseContacts()}`);
  }

  let resultat: Awaited<ReturnType<typeof capturerCommandePayPal>>;
  try {
    resultat = await capturerCommandePayPal(config, lien, commande);
  } catch (erreur) {
    console.error(`[paiement] Capture PayPal impossible : ${lien.ref} · ${commande} (${descriptionErreurPayPal(erreur)})`);
    return refuser(
      502,
      `Nous n'avons pas pu confirmer votre paiement PayPal. Vérifiez votre compte PayPal avant de réessayer. ${phraseContacts()}`,
    );
  }

  switch (resultat.statut) {
    case "paye":
    case "en-cours": {
      console.info(`[paiement] Capture PayPal ${resultat.captureId} (${resultat.statut}) : ${lien.ref} · encaisseur ${lien.encaisseur}`);
      if (resultat.statut === "paye") {
        const courriel = courrielPaiementRecu({
          reference: lien.ref,
          encaisseur: lien.encaisseur,
          centimes: resultat.centimes,
          devise: "eur",
          moyen: "PayPal",
          date: resultat.date,
          prestataire: "PayPal",
          identifiant: resultat.captureId,
          test: config.environnement === "sandbox",
        });
        // Le client a payé : un e-mail qui ne part pas ne change rien pour lui (journalisé).
        await envoyerCourrielPaiement(lien.encaisseur, courriel, `paiement-paypal/${resultat.captureId}`);
      }
      const corps: ReponseCapture = {
        ok: true,
        redirection: `/paiement/merci?ref=${lien.ref}&encaisseur=${lien.encaisseur}&paypal=${commande}`,
      };
      return repondre(corps);
    }
    case "instrument-refuse":
      return repondre(
        { ok: false, relancer: true, message: "PayPal a refusé ce moyen de paiement. Choisissez-en un autre dans la fenêtre PayPal." },
        422,
      );
    case "deja-regle":
      return refuser(409, `Cette prestation semble déjà réglée avec PayPal. ${phraseContacts()}`);
    case "incoherente":
      console.error(`[paiement] Commande PayPal ${commande} différente du lien ${lien.ref} : non capturée`);
      return refuser(409, `Cette commande PayPal ne correspond pas à votre lien de paiement : nous ne l'avons pas validée. ${phraseContacts()}`);
    case "non-paye":
      return refuser(409, `Le paiement PayPal n'a pas été validé. Rien n'a été débité : réessayez. ${phraseContacts()}`);
  }
}
