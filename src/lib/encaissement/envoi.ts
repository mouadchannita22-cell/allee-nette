/**
 * Envoi des e-mails de paiement à l'associé qui encaisse, avec Resend
 * (serveur uniquement). Même configuration et même mode démonstration que
 * les e-mails de réservation (lib/reservation/envoi.ts) :
 * - RESEND_API_KEY et RESERVATION_EXPEDITEUR, lues à l'exécution ;
 * - destinataire : l'e-mail de l'associé dans config/site.ts, sinon
 *   l'adresse générale du site ;
 * - sans clé hors production : démonstration, rien ne part.
 *
 * Les journaux ne contiennent que l'objet (référence, montant, prestataire).
 */
import "server-only";
import { Resend } from "resend";
import { estRenseigne, site, type Encaisseur } from "@/config/site";
import { enProduction } from "@/lib/environnement";
import { modeEnvoi, type ConfigurationEnvoi, type Courriel } from "@/lib/reservation/emails";

export type StatutEnvoi = "envoye" | "demo" | "non-configure" | "echec";

/** Destinataire des e-mails de paiement d'un encaisseur. */
export function destinatairesPaiement(encaisseur: Encaisseur): string[] {
  const associe = site.associes[encaisseur].email;
  if (estRenseigne(associe)) return [associe];
  return estRenseigne(site.email) ? [site.email] : [];
}

function configuration(encaisseur: Encaisseur): ConfigurationEnvoi {
  return {
    cle: process.env.RESEND_API_KEY?.trim() ?? "",
    expediteur: process.env.RESERVATION_EXPEDITEUR?.trim() ?? "",
    destinataires: destinatairesPaiement(encaisseur),
    production: enProduction(),
  };
}

/**
 * Envoie un e-mail de paiement, sans jamais lever d'erreur. `idempotence`
 * évite un doublon si Stripe renvoie le même événement (24 h chez Resend).
 */
export async function envoyerCourrielPaiement(
  encaisseur: Encaisseur,
  courriel: Courriel,
  idempotence: string,
): Promise<StatutEnvoi> {
  const config = configuration(encaisseur);
  const mode = modeEnvoi(config);
  if (mode === "demo") {
    console.info(`[paiement] Démonstration, aucun e-mail envoyé : ${courriel.objet}`);
    return "demo";
  }
  if (mode === "non-configure") {
    console.error(`[paiement] Envoi non configuré (clé, expéditeur ou e-mail de l'associé ${encaisseur}) : ${courriel.objet}`);
    return "non-configure";
  }
  try {
    const { error } = await new Resend(config.cle).emails.send(
      {
        from: config.expediteur,
        to: [...config.destinataires],
        subject: courriel.objet,
        html: courriel.html,
        text: courriel.texte,
      },
      { idempotencyKey: idempotence },
    );
    if (!error) return "envoye";
    console.error(`[paiement] Échec de l'e-mail (${error.name}, ${error.statusCode ?? "réseau"}) : ${courriel.objet}`);
  } catch (erreur) {
    console.error(`[paiement] Échec de l'e-mail (${erreur instanceof Error ? erreur.name : "erreur"}) : ${courriel.objet}`);
  }
  return "echec";
}
