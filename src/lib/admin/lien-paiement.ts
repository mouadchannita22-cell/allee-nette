/**
 * Échange entre la page /admin/lien-paiement et la route
 * POST /api/admin/lien-paiement, et partage du lien généré (message type,
 * WhatsApp, SMS). Fonctions pures, sans secret : le navigateur les charge.
 *
 * Le téléphone du client sert seulement à préremplir WhatsApp ou les SMS
 * dans le navigateur : il n'est jamais envoyé au serveur.
 */
import { site, type Encaisseur } from "@/config/site";
import { VALIDITE_LIEN_JOURS } from "@/data/paiement";
import { FORMULES, GABARITS } from "@/data/offres";
import { formaterEuros } from "@/lib/montant";
import { normaliserTelephone } from "@/lib/telephone";

export const URL_API_LIEN_PAIEMENT = "/api/admin/lien-paiement";

/** Corps JSON de la demande de lien. Le montant est envoyé tel que saisi (« 119,50 »). */
export type DemandeLien = { ref: string; montant: string; libelle: string; encaisseur: Encaisseur | "" };

export type ChampDemande = keyof DemandeLien;

/** Lien généré, tel que renvoyé par la route. */
export type LienGenere = {
  /** URL absolue du lien signé. */
  url: string;
  /** Fin de validité, au format ISO 8601. */
  expireLe: string;
  ref: string;
  centimes: number;
  libelle: string;
  encaisseur: Encaisseur;
};

export type ReponseLien =
  | ({ ok: true } & LienGenere)
  | { ok: false; message: string; champs?: Partial<Record<ChampDemande, string>> };

const MESSAGE_ILLISIBLE = "La réponse du serveur est illisible. Réessayez dans un instant.";
const MESSAGE_SESSION = "Identifiants refusés : rechargez la page pour vous reconnecter.";

/** Lit la réponse de la route, sans faire confiance à sa forme. */
export function lireReponseLien(json: unknown, statut: number): ReponseLien {
  const r = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  if (
    r.ok === true &&
    typeof r.url === "string" &&
    /^https?:\/\//.test(r.url) &&
    typeof r.expireLe === "string" &&
    !Number.isNaN(Date.parse(r.expireLe)) &&
    typeof r.ref === "string" &&
    typeof r.centimes === "number" &&
    typeof r.libelle === "string" &&
    (r.encaisseur === "A" || r.encaisseur === "B")
  ) {
    return {
      ok: true,
      url: r.url,
      expireLe: r.expireLe,
      ref: r.ref,
      centimes: r.centimes,
      libelle: r.libelle,
      encaisseur: r.encaisseur,
    };
  }
  const message =
    statut === 401 ? MESSAGE_SESSION : typeof r.message === "string" && r.message ? r.message : MESSAGE_ILLISIBLE;
  const champs =
    typeof r.champs === "object" && r.champs !== null
      ? Object.fromEntries(Object.entries(r.champs).filter((e): e is [string, string] => typeof e[1] === "string"))
      : undefined;
  return { ok: false, message, ...(champs && Object.keys(champs).length > 0 ? { champs } : {}) };
}

// ---------------------------------------------------------------------------
// Suggestions de libellé
// ---------------------------------------------------------------------------

/** Libellés proposés : chaque formule pour chaque gabarit (« Le Complet M »), avec le prix de la grille. */
export function suggestionsLibelle(): readonly { libelle: string; prix: number }[] {
  return FORMULES.flatMap((f) => GABARITS.map((g) => ({ libelle: `${f.nom} ${g.code}`, prix: f.prix[g.code] })));
}

// ---------------------------------------------------------------------------
// Partage
// ---------------------------------------------------------------------------

/** Message envoyé au client. Espaces ordinaires : un SMS reste dans l'encodage le plus court possible. */
export function messageLienPaiement({ ref, centimes, url }: Pick<LienGenere, "ref" | "centimes" | "url">): string {
  return `Bonjour, voici le lien sécurisé pour régler votre prestation ${site.nom} (réf. ${ref}, ${formaterEuros(centimes, " ")}) : ${url} Il est valable ${VALIDITE_LIEN_JOURS} jours.`;
}

/**
 * Téléphone saisi pour le partage : numéro international (« +33612345678 »),
 * `null` si le champ est vide, `false` s'il n'est pas reconnu.
 */
export function telephonePartage(saisie: string): string | null | false {
  if (saisie.trim() === "") return null;
  return normaliserTelephone(saisie) ?? false;
}

/** Lien WhatsApp : vers le numéro du client s'il est connu, sinon WhatsApp propose de choisir le contact. */
export function lienWhatsAppPaiement(message: string, telephone: string | null): string {
  const numero = telephone ? telephone.replace(/\D/g, "") : "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

/** Lien SMS (« sms:+336…?&body=… », forme comprise par iOS et Android). */
export function lienSmsPaiement(message: string, telephone: string | null): string {
  return `sms:${telephone ?? ""}?&body=${encodeURIComponent(message)}`;
}
