/**
 * POST /api/reservation : réception d'une demande de réservation.
 *
 * Envoi multipart/form-data : un champ JSON `donnees` (lib/reservation/api.ts)
 * et jusqu'à trois photos. Dans l'ordre : limitation du débit, taille de la
 * requête, lecture, anti-spam, schéma, devis recalculé (jamais repris du
 * navigateur), photos, référence, e-mails.
 *
 * Réponse : `{ ok: true, reference, demo? }` ou `{ ok: false, message, champs? }`,
 * jamais mise en cache. Aucune donnée personnelle n'est conservée.
 */
import { estRenseigne, ouACompleter, site } from "@/config/site";
import { PHOTOS_DEMANDEES } from "@/data/reservation";
import { enProduction } from "@/lib/environnement";
import { formaterTelephone } from "@/lib/telephone";
import {
  adresseClient,
  delaiRespecte,
  lireAntiSpam,
  piegeRempli,
  reglesDebit,
  verifierDebit,
  type MemoireDebit,
} from "@/lib/reservation/anti-spam";
import { CHAMP_DONNEES, type ReponseReservation } from "@/lib/reservation/api";
import { blocageDevis, devisReservation, zoneReservation } from "@/lib/reservation/devis";
import { envoyerDemande, modeEnvoiActuel } from "@/lib/reservation/envoi";
import { TAILLE_MAX_REQUETE, verifierPhotos, type FichierRecu } from "@/lib/reservation/photos";
import { obtenirReference, referenceSecours } from "@/lib/reservation/reference";
import { creerSchemaReservation, erreursDepuisZod } from "@/lib/reservation/schema";

/** Demandes récentes par adresse IP, en mémoire de l'instance (10 minutes au plus). */
const memoireDebit: MemoireDebit = new Map();

function repondre(corps: ReponseReservation, statut = 200, entetes: Record<string, string> = {}): Response {
  // Les en-têtes de netlify.toml ne s'appliquent pas aux fonctions : on les pose ici.
  return Response.json(corps, { status: statut, headers: { "Cache-Control": "no-store", ...entetes } });
}

function refuser(statut: number, message: string, champs?: Record<string, string>): Response {
  return repondre({ ok: false, message, ...(champs ? { champs } : {}) }, statut);
}

/** Nos contacts, pour ne jamais laisser une demande sans issue. */
function contacts(): string {
  const whatsapp = estRenseigne(site.whatsapp)
    ? formaterTelephone(`+${site.whatsapp.replace(/\D/g, "")}`)
    : ouACompleter(site.whatsapp, "numéro WhatsApp");
  return `Appelez-nous (${ouACompleter(site.telephone, "téléphone")}) ou écrivez-nous sur WhatsApp (${whatsapp}).`;
}

const ILLISIBLE = "Votre demande n'a pas pu être lue. Rechargez la page, puis réessayez.";

export async function POST(request: Request): Promise<Response> {
  const maintenant = new Date();

  // 1. Limitation du débit, par adresse IP.
  const debit = verifierDebit(
    memoireDebit,
    adresseClient(request.headers),
    maintenant.getTime(),
    reglesDebit(enProduction(), process.env.RESERVATION_LIMITE_DEBIT),
  );
  if (!debit.autorise) {
    const minutes = Math.max(1, Math.ceil(debit.reessayerDansMs / 60_000));
    return repondre(
      {
        ok: false,
        message: `Trop de demandes envoyées depuis cette connexion. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}, ou contactez-nous directement. ${contacts()}`,
      },
      429,
      { "Retry-After": String(Math.ceil(debit.reessayerDansMs / 1000)) },
    );
  }

  // 2. Taille annoncée, avant de lire le corps.
  const longueur = Number(request.headers.get("content-length"));
  if (Number.isFinite(longueur) && longueur > TAILLE_MAX_REQUETE) {
    return refuser(413, "Vos photos sont trop lourdes : 3 Mo au total au plus. Retirez-en une, ou envoyez-les-nous sur WhatsApp.");
  }

  // 3. Lecture.
  let formulaire: FormData;
  try {
    formulaire = await request.formData();
  } catch {
    return refuser(400, ILLISIBLE);
  }
  const brut = formulaire.get(CHAMP_DONNEES);
  let json: unknown = null;
  try {
    json = typeof brut === "string" ? JSON.parse(brut) : null;
  } catch {
    // JSON invalide : traité juste en dessous.
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) return refuser(400, ILLISIBLE);

  // 4. Anti-spam : un robot pris au piège reçoit un faux succès, et rien ne part.
  const antiSpam = lireAntiSpam((json as { antiSpam?: unknown }).antiSpam);
  if (piegeRempli(antiSpam)) return repondre({ ok: true, reference: referenceSecours(maintenant) });
  if (!delaiRespecte(antiSpam)) {
    return refuser(422, "Votre demande est partie un peu vite. Patientez quelques secondes, puis renvoyez-la.");
  }

  // 5. Schéma (un jour de tolérance sur les créneaux).
  const verification = creerSchemaReservation({ maintenant, toleranceJours: 1 }).safeParse(json);
  if (!verification.success) {
    return refuser(422, "Certaines réponses sont à corriger.", erreursDepuisZod(verification.error));
  }
  const demande = verification.data;

  // 6. Devis recalculé ici. Hors zone, la demande reste possible (sur demande).
  const zone = zoneReservation(demande.lieu.commune);
  const devis = devisReservation(
    { voitures: demande.voitures, commune: demande.lieu.commune, code: demande.coordonnees.code },
    zone,
  );
  const blocage = blocageDevis(devis);
  if (blocage) return refuser(422, blocage, { devis: blocage });

  // 7. Photos : 3 au plus, 1 Mo chacune, 3 Mo au total, vraies images.
  const fichiers: FichierRecu[] = [];
  for (const [champ, valeur] of formulaire.entries()) {
    if (typeof valeur === "string") continue;
    if (!PHOTOS_DEMANDEES.some((p) => p.champ === champ) && valeur.size > 0) {
      return refuser(422, "Fichier inattendu dans la demande.");
    }
    fichiers.push({ champ, type: valeur.type, contenu: new Uint8Array(await valeur.arrayBuffer()) });
  }
  const photos = verifierPhotos(fichiers);
  if (!photos.ok) return refuser(photos.statut, photos.message, photos.champ ? { [photos.champ]: photos.message } : undefined);

  // 8. Référence, puis e-mails. Envoi non configuré : inutile de consommer une référence.
  const indisponible = `L'envoi des demandes en ligne est momentanément indisponible. ${contacts()}`;
  if (modeEnvoiActuel() === "non-configure") {
    console.error("[réservation] Envoi non configuré : clé Resend, expéditeur ou e-mails des associés manquants");
    return refuser(503, indisponible);
  }
  const { reference, secours } = await obtenirReference(maintenant);
  const envoi = await envoyerDemande({
    reference,
    referenceSecours: secours,
    recueLe: maintenant,
    demande,
    zone,
    devis,
    photos: photos.photos,
  });

  switch (envoi.statut) {
    case "envoye":
      return repondre({ ok: true, reference });
    case "demo":
      return repondre({ ok: true, reference, demo: true });
    case "non-configure":
      return refuser(503, indisponible);
    case "echec":
      return refuser(502, `Votre demande n'a pas pu partir. ${contacts()}`);
  }
}
