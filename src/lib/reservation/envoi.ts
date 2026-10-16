/**
 * Envoi des e-mails de réservation avec Resend (serveur uniquement).
 *
 * Variables d'environnement, lues à l'exécution (jamais recopiées au build) :
 * - RESEND_API_KEY : clé d'API Resend ;
 * - RESERVATION_EXPEDITEUR : « Allée Nette <reservation@votre-domaine.fr> »,
 *   sur un domaine vérifié chez Resend.
 * Destinataires : adresses des associés dans config/site.ts.
 *
 * Aucune donnée personnelle n'est conservée ni journalisée : les journaux
 * ne contiennent que la référence et des compteurs.
 */
import "server-only";
import { Resend } from "resend";
import { estRenseigne, site } from "@/config/site";
import { enProduction } from "@/lib/environnement";
import {
  courrielAssocies,
  courrielClient,
  modeEnvoi,
  type ConfigurationEnvoi,
  type DemandePreparee,
  type PhotoJointe,
} from "./emails";

/** Photo vérifiée, avec son contenu. */
export type PhotoAEnvoyer = PhotoJointe & { contenu: Uint8Array };

export type DemandeAEnvoyer = Omit<DemandePreparee, "photos"> & { photos: readonly PhotoAEnvoyer[] };

export type ResultatEnvoi =
  /** E-mail aux associés parti ; `clientPrevenu` : l'e-mail au client aussi. */
  | { statut: "envoye"; clientPrevenu: boolean }
  /** Mode démonstration : rien n'est parti. */
  | { statut: "demo" }
  /** Production sans clé, sans expéditeur ou sans destinataire. */
  | { statut: "non-configure" }
  /** L'e-mail aux associés n'est pas parti. */
  | { statut: "echec" };

type ReponseResend = Awaited<ReturnType<Resend["emails"]["send"]>>;

/** Envoie sans jamais lever d'erreur : Resend renvoie ses erreurs, on rattrape le reste. */
async function envoyer(envoi: () => Promise<ReponseResend>): Promise<string | null> {
  try {
    const { error } = await envoi();
    return error ? `${error.name}, ${error.statusCode ?? "réseau"}` : null;
  } catch (erreur) {
    return erreur instanceof Error ? erreur.name : "erreur";
  }
}

function configuration(): ConfigurationEnvoi {
  return {
    cle: process.env.RESEND_API_KEY?.trim() ?? "",
    expediteur: process.env.RESERVATION_EXPEDITEUR?.trim() ?? "",
    destinataires: [site.associes.A.email, site.associes.B.email].filter(estRenseigne),
    production: enProduction(),
  };
}

/** Mode d'envoi en vigueur : la route le vérifie avant de consommer une référence. */
export function modeEnvoiActuel(): ReturnType<typeof modeEnvoi> {
  return modeEnvoi(configuration());
}

/** Envoie la demande aux associés (photos jointes), puis la confirmation au client. */
export async function envoyerDemande(d: DemandeAEnvoyer): Promise<ResultatEnvoi> {
  const { cle, expediteur, destinataires, production } = configuration();
  const mode = modeEnvoi({ cle, expediteur, destinataires, production });

  if (mode === "demo") {
    const statut = d.devis.statut === "estimation" ? `${d.devis.total} €` : d.devis.statut;
    console.info(
      `[réservation] Démonstration, aucun e-mail envoyé : ${d.reference} · ${d.demande.voitures.length} voiture(s) · ${d.zone} · ${statut} · ${d.photos.length} photo(s)`,
    );
    return { statut: "demo" };
  }
  if (mode === "non-configure") {
    console.error(`[réservation] Envoi non configuré (clé, expéditeur ou destinataires manquants) : ${d.reference}`);
    return { statut: "non-configure" };
  }

  const resend = new Resend(cle);
  const marque = `${d.reference}-${d.recueLe.getTime()}`;

  const associes = courrielAssocies(d);
  const echecAssocies = await envoyer(() =>
    resend.emails.send(
      {
        from: expediteur,
        to: [...destinataires],
        replyTo: d.demande.coordonnees.email,
        subject: associes.objet,
        html: associes.html,
        text: associes.texte,
        attachments: d.photos.map((p) => ({
          filename: p.nomFichier,
          // Base64 : un Buffer passerait dans JSON.stringify sous une forme énorme.
          content: Buffer.from(p.contenu).toString("base64"),
          contentType: p.type,
        })),
      },
      { idempotencyKey: `${marque}/associes` },
    ),
  );
  if (echecAssocies) {
    console.error(`[réservation] Échec de l'e-mail aux associés ${d.reference} (${echecAssocies})`);
    return { statut: "echec" };
  }

  const client = courrielClient(d);
  const echecClient = await envoyer(() =>
    resend.emails.send(
      {
        from: expediteur,
        to: [d.demande.coordonnees.email],
        replyTo: estRenseigne(site.email) ? site.email : [...destinataires],
        subject: client.objet,
        html: client.html,
        text: client.texte,
      },
      { idempotencyKey: `${marque}/client` },
    ),
  );
  if (echecClient) console.error(`[réservation] Échec de l'e-mail au client ${d.reference} (${echecClient})`);
  return { statut: "envoye", clientPrevenu: !echecClient };
}
