/**
 * Lecture commune des demandes de paiement venues de la page /paiement
 * (session Stripe, commande et capture PayPal). Dans l'ordre :
 * 1. même site seulement (Sec-Fetch-Site) ;
 * 2. limitation du débit en mémoire, par adresse IP ;
 * 3. JSON de petite taille ;
 * 4. lien signé revérifié (signature, montant, expiration) : le serveur ne
 *    fait jamais confiance au navigateur.
 *
 * Réponses jamais mises en cache. Aucune donnée n'est conservée.
 */
import "server-only";
import { MESSAGES_LIEN } from "@/data/paiement";
import { phraseContacts } from "@/lib/contact";
import type { LienPaiement } from "@/lib/paiement";
import { verifierLienPaiement } from "@/lib/paiement-serveur";
import { adresseClient, verifierDebit, type MemoireDebit, type ReglesDebit } from "@/lib/reservation/anti-spam";
import { parametresDepuisJson, type Refus } from "./api";

/** Demandes de paiement par adresse IP : 10 par 10 minutes (un client en fait une ou deux). */
export const DEBIT_PAIEMENT: ReglesDebit = { max: 10, fenetreMs: 10 * 60_000 };

/** Corps attendu : quelques centaines d'octets. */
const TAILLE_MAX = 4_096;

/** Réponse JSON, jamais mise en cache (les en-têtes de netlify.toml ne s'appliquent pas aux fonctions). */
export function repondre(corps: unknown, statut = 200, entetes: Record<string, string> = {}): Response {
  return Response.json(corps, { status: statut, headers: { "Cache-Control": "no-store", ...entetes } });
}

export function refuser(statut: number, message: string, entetes: Record<string, string> = {}): Response {
  const corps: Refus = { ok: false, message };
  return repondre(corps, statut, entetes);
}

const ILLISIBLE = "Demande illisible : rechargez la page, puis réessayez.";

export type DemandeLue = { ok: true; lien: LienPaiement; json: Record<string, unknown> } | { ok: false; reponse: Response };

/** Lit et vérifie une demande de paiement. Ne lève jamais d'erreur. */
export async function lireDemandePaiement(request: Request, memoire: MemoireDebit, maintenant: Date): Promise<DemandeLue> {
  const echec = (reponse: Response): DemandeLue => ({ ok: false, reponse });

  // 1. Même site : la page /paiement, jamais un autre site.
  const provenance = request.headers.get("sec-fetch-site");
  if (provenance !== null && provenance !== "same-origin" && provenance !== "none") {
    return echec(refuser(403, "Demande refusée : elle doit venir de la page de paiement."));
  }

  // 2. Débit.
  const debit = verifierDebit(memoire, adresseClient(request.headers), maintenant.getTime(), DEBIT_PAIEMENT);
  if (!debit.autorise) {
    const minutes = Math.max(1, Math.ceil(debit.reessayerDansMs / 60_000));
    return echec(
      refuser(
        429,
        `Trop de tentatives depuis cette connexion. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}. ${phraseContacts()}`,
        { "Retry-After": String(Math.ceil(debit.reessayerDansMs / 1000)) },
      ),
    );
  }

  // 3. JSON de petite taille.
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) return echec(refuser(415, ILLISIBLE));
  const longueur = Number(request.headers.get("content-length"));
  if (Number.isFinite(longueur) && longueur > TAILLE_MAX) return echec(refuser(413, ILLISIBLE));
  let json: unknown;
  try {
    const texte = await request.text();
    if (texte.length > TAILLE_MAX) return echec(refuser(413, ILLISIBLE));
    json = JSON.parse(texte);
  } catch {
    return echec(refuser(400, ILLISIBLE));
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) return echec(refuser(400, ILLISIBLE));
  const corps = json as Record<string, unknown>;

  // 4. Lien signé, revérifié.
  const verification = verifierLienPaiement(parametresDepuisJson(corps), maintenant);
  if (!verification.valide) {
    const { titre, texte } = MESSAGES_LIEN[verification.raison];
    const statut = verification.raison === "configuration" ? 503 : 422;
    return echec(refuser(statut, `${titre}. ${texte} ${phraseContacts()}`));
  }
  return { ok: true, lien: verification.lien, json: corps };
}
