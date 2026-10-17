/**
 * POST /api/admin/lien-paiement : génère un lien de paiement signé.
 *
 * Corps JSON (lib/admin/lien-paiement.ts) : référence, montant, libellé,
 * encaisseur. Réponse : URL absolue signée et date d'expiration, ou un
 * message par champ à corriger. Jamais mise en cache, rien n'est conservé.
 *
 * Dans l'ordre :
 * 1. authentification Basic, revérifiée ici même si le proxy l'a déjà
 *    contrôlée (défense en profondeur) ;
 * 2. JSON et même origine seulement : le navigateur joint les identifiants
 *    mémorisés à toute requête vers ce site, y compris depuis un autre site ;
 *    un envoi JSON venu d'ailleurs est bloqué par le navigateur (CORS) ;
 * 3. vérification des données (lib/paiement.ts), puis signature.
 */
import { ENTETES_ADMIN, reponseRefus, verifierAuthentification } from "@/lib/admin/authentification";
import type { ReponseLien } from "@/lib/admin/lien-paiement";
import { montantPourUrl } from "@/lib/montant";
import { SecretLienInvalide, verifierDonneesLien } from "@/lib/paiement";
import { genererLienPaiement } from "@/lib/paiement-serveur";

/** Corps attendu : quelques centaines d'octets. */
const TAILLE_MAX = 4_096;

function repondre(corps: ReponseLien, statut = 200): Response {
  // Les en-têtes de netlify.toml ne s'appliquent pas aux fonctions : on les pose ici.
  return Response.json(corps, { status: statut, headers: ENTETES_ADMIN });
}

function refuser(statut: number, message: string, champs?: Record<string, string>): Response {
  return repondre({ ok: false, message, ...(champs ? { champs } : {}) }, statut);
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentification.
  const etat = await verifierAuthentification(request.headers.get("authorization"), process.env.ADMIN_PASSWORD);
  if (etat !== "autorise") return reponseRefus(etat, "json");

  // 2. JSON, depuis la page d'administration de ce site.
  const provenance = request.headers.get("sec-fetch-site");
  if (provenance !== null && provenance !== "same-origin" && provenance !== "none") {
    return refuser(403, "Demande refusée : elle doit venir de la page d'administration.");
  }
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return refuser(415, "Demande illisible : JSON attendu.");
  }
  const longueur = Number(request.headers.get("content-length"));
  if (Number.isFinite(longueur) && longueur > TAILLE_MAX) return refuser(413, "Demande trop longue.");

  let json: unknown;
  try {
    const texte = await request.text();
    if (texte.length > TAILLE_MAX) return refuser(413, "Demande trop longue.");
    json = JSON.parse(texte);
  } catch {
    return refuser(400, "Demande illisible : rechargez la page, puis réessayez.");
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return refuser(400, "Demande illisible : rechargez la page, puis réessayez.");
  }

  // 3. Données, puis signature.
  const verification = verifierDonneesLien(json as Record<string, unknown>);
  if (!verification.ok) return refuser(422, "Certaines réponses sont à corriger.", verification.erreurs);
  const { ref, centimes, libelle, encaisseur } = verification.donnees;

  try {
    const { url, expireLe } = genererLienPaiement({ ref, montant: montantPourUrl(centimes), libelle, encaisseur });
    return repondre({ ok: true, url, expireLe: expireLe.toISOString(), ref, centimes, libelle, encaisseur });
  } catch (erreur) {
    if (erreur instanceof SecretLienInvalide) {
      console.error(`[paiement] ${erreur.message}`);
      return refuser(
        503,
        "Liens de paiement non configurés : ajoutez PAYMENT_LINK_SECRET (32 caractères au moins) aux variables d'environnement, puis redéployez.",
      );
    }
    throw erreur;
  }
}
