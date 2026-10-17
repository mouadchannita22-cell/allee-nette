/**
 * Liens de paiement signés (partie 10.2 du brief). Fonctions pures, serveur
 * uniquement (node:crypto) : le navigateur n'en a jamais besoin, il reçoit
 * des liens déjà signés.
 *
 * Format : /paiement?ref=AN-2026-0142&montant=119&libelle=Le%20Complet%20M&encaisseur=A&exp=…&sig=…
 *
 * - `montant` en euros (« 119 » ou « 119.50 »), contrôlé entre les bornes
 *   de data/paiement.ts, signé en centimes : « 119 » et « 119.00 » donnent
 *   la même signature.
 * - `exp` : fin de validité en secondes Unix, 7 jours après la génération.
 * - `sig` : HMAC-SHA256 en base64url de `chaineASigner`, avec le secret
 *   PAYMENT_LINK_SECRET (32 caractères au moins). Le secret est passé en
 *   paramètre ; lib/paiement-serveur.ts le lit dans l'environnement.
 * - La vérification compare les signatures en temps constant.
 *
 * Aucune donnée n'est conservée : tout ce qu'il faut est dans le lien.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Encaisseur } from "@/config/site";
import { BORNES_MONTANT, CHEMIN_PAIEMENT, LIBELLE_MAX, VALIDITE_LIEN_JOURS } from "@/data/paiement";
import { FORMAT_REFERENCE } from "@/lib/reservation/api";
import { montantAutorise, montantPourUrl, normaliserMontant } from "./montant";

export { normaliserMontant } from "./montant";

/** Préfixe de la chaîne signée : change si le format de signature change un jour. */
export const VERSION_SIGNATURE = "v1";

/** Longueur minimale de PAYMENT_LINK_SECRET. */
export const SECRET_MIN = 32;

/** Commande qui génère un secret, rappelée dans les messages d'erreur et dans .env.example. */
export const COMMANDE_SECRET = `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`;

/** Secret absent ou trop court. Le message ne contient jamais le secret. */
export class SecretLienInvalide extends Error {
  override name = "SecretLienInvalide";
  constructor() {
    super(`PAYMENT_LINK_SECRET manquant ou trop court (${SECRET_MIN} caractères au moins). Générez-en un avec : ${COMMANDE_SECRET}`);
  }
}

/** Vrai si le secret est présent et assez long. */
export function secretSuffisant(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.trim().length >= SECRET_MIN;
}

function exigerSecret(secret: string | undefined): string {
  if (!secretSuffisant(secret)) throw new SecretLienInvalide();
  return secret;
}

// ---------------------------------------------------------------------------
// Champs du lien
// ---------------------------------------------------------------------------

export const ENCAISSEURS: readonly Encaisseur[] = ["A", "B"];

export function estEncaisseur(valeur: unknown): valeur is Encaisseur {
  return valeur === "A" || valeur === "B";
}

const CONTROLE = /\p{Cc}/u;

/** Libellé canonique : forme Unicode composée (NFC), espaces simples, sans espace autour. */
export function normaliserLibelle(texte: string): string {
  return texte.normalize("NFC").replace(/\s+/gu, " ").trim();
}

/** Raison pour laquelle un libellé déjà normalisé est refusé, ou `null` s'il convient. */
function defautLibelle(libelle: string): "vide" | "long" | "caractere" | null {
  if (libelle === "") return "vide";
  if (!libelle.isWellFormed() || CONTROLE.test(libelle)) return "caractere";
  if ([...libelle].length > LIBELLE_MAX) return "long";
  return null;
}

/** Données saisies pour un lien (page d'administration). */
export type DonneesLien = {
  ref: string;
  /** En euros : « 119 », « 119.5 », « 119,50 » ou 119.5. */
  montant: string | number;
  libelle: string;
  encaisseur: Encaisseur;
};

export type ChampLien = keyof DonneesLien;

/** Données vérifiées, prêtes à signer. */
export type DonneesValides = { ref: string; centimes: number; libelle: string; encaisseur: Encaisseur };

export type ErreursLien = Partial<Record<ChampLien, string>>;

const MESSAGES_LIBELLE = {
  vide: "Indiquez la prestation, par exemple « Le Complet M ».",
  long: `Le libellé est trop long : ${LIBELLE_MAX} caractères au plus.`,
  caractere: "Le libellé contient un caractère non autorisé.",
} as const;

/**
 * Vérifie les données saisies dans l'administration, sans jamais lever
 * d'erreur. Renvoie les données normalisées, ou un message par champ.
 */
export function verifierDonneesLien(
  saisie: Partial<Record<ChampLien, unknown>>,
): { ok: true; donnees: DonneesValides } | { ok: false; erreurs: ErreursLien } {
  const erreurs: ErreursLien = {};

  const ref = typeof saisie.ref === "string" ? saisie.ref.trim().toUpperCase() : "";
  if (!FORMAT_REFERENCE.test(ref)) erreurs.ref = "Indiquez la référence de la demande, au format AN-2026-0142.";

  const brut = typeof saisie.montant === "string" || typeof saisie.montant === "number" ? saisie.montant : "";
  const centimes = normaliserMontant(brut);
  if (centimes === null) erreurs.montant = "Indiquez le montant en euros, par exemple 119 ou 119,50.";
  else if (!montantAutorise(centimes)) {
    erreurs.montant = `Le montant doit être compris entre ${BORNES_MONTANT.minEuros} € et ${BORNES_MONTANT.maxEuros} €.`;
  }

  const libelle = typeof saisie.libelle === "string" ? normaliserLibelle(saisie.libelle) : "";
  const defaut = defautLibelle(libelle);
  if (defaut) erreurs.libelle = MESSAGES_LIBELLE[defaut];

  const encaisseur = saisie.encaisseur;
  if (!estEncaisseur(encaisseur)) erreurs.encaisseur = "Choisissez qui encaisse : A ou B.";

  if (Object.keys(erreurs).length > 0 || centimes === null || !estEncaisseur(encaisseur)) return { ok: false, erreurs };
  return { ok: true, donnees: { ref, centimes, libelle, encaisseur } };
}

// ---------------------------------------------------------------------------
// Signature
// ---------------------------------------------------------------------------

/** Ce que couvre la signature. */
export type ChampsSignes = DonneesValides & {
  /** Fin de validité, en secondes Unix. */
  exp: number;
};

/**
 * Chaîne signée, une valeur par ligne, précédée de la version :
 * « v1⏎AN-2026-0142⏎11900⏎Le Complet M⏎A⏎1761900000 ».
 * Sans ambiguïté : seul le libellé est libre, et il ne peut pas contenir de
 * retour à la ligne (caractère de contrôle refusé).
 */
export function chaineASigner({ ref, centimes, libelle, encaisseur, exp }: ChampsSignes): string {
  if (CONTROLE.test(libelle)) throw new TypeError("Libellé avec un caractère de contrôle : impossible à signer");
  if (!Number.isInteger(centimes) || !Number.isInteger(exp)) throw new TypeError("Montant ou expiration non entier");
  return [VERSION_SIGNATURE, ref, String(centimes), libelle, encaisseur, String(exp)].join("\n");
}

function calculerSignature(champs: ChampsSignes, secret: string): string {
  return createHmac("sha256", secret).update(chaineASigner(champs), "utf8").digest("base64url");
}

/** Comparaison en temps constant (longueurs vérifiées d'abord, comme l'exige timingSafeEqual). */
function signaturesEgales(recue: string, attendue: string): boolean {
  const a = Buffer.from(recue, "utf8");
  const b = Buffer.from(attendue, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Encodage strict (RFC 3986) : même « ' ( ) ! * » sont encodés, pour que les messageries ne coupent pas le lien. */
function encoder(valeur: string): string {
  return encodeURIComponent(valeur).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Lien relatif, dans l'ordre ref, montant, libelle, encaisseur, exp, sig. */
function construireChemin(champs: ChampsSignes, sig: string): string {
  const parametres: [string, string][] = [
    ["ref", champs.ref],
    ["montant", montantPourUrl(champs.centimes)],
    ["libelle", champs.libelle],
    ["encaisseur", champs.encaisseur],
    ["exp", String(champs.exp)],
    ["sig", sig],
  ];
  return `${CHEMIN_PAIEMENT}?${parametres.map(([cle, valeur]) => `${cle}=${encoder(valeur)}`).join("&")}`;
}

/** Lien vérifié ou tout juste signé. */
export type LienPaiement = ChampsSignes & {
  sig: string;
  /** Lien relatif canonique (retour depuis Stripe en cas d'abandon). */
  chemin: string;
};

/** Fin de validité d'un lien généré maintenant, en secondes Unix. */
export function expirationDepuis(maintenant: Date): number {
  return Math.floor(maintenant.getTime() / 1000) + VALIDITE_LIEN_JOURS * 86_400;
}

/** Signe un lien et renvoie tous ses champs. Lève une erreur si une donnée est invalide ou si le secret manque. */
export function creerLien(donnees: DonneesLien, maintenant: Date, secret: string | undefined): LienPaiement {
  const cle = exigerSecret(secret);
  const verification = verifierDonneesLien(donnees);
  if (!verification.ok) {
    throw new RangeError(`Lien de paiement impossible à signer (${Object.keys(verification.erreurs).join(", ")})`);
  }
  const champs: ChampsSignes = { ...verification.donnees, exp: expirationDepuis(maintenant) };
  const sig = calculerSignature(champs, cle);
  return { ...champs, sig, chemin: construireChemin(champs, sig) };
}

/** Lien de paiement signé, relatif : « /paiement?ref=…&sig=… ». */
export function signerLien(donnees: DonneesLien, maintenant: Date, secret: string | undefined): string {
  return creerLien(donnees, maintenant, secret).chemin;
}

// ---------------------------------------------------------------------------
// Vérification
// ---------------------------------------------------------------------------

/** Paramètres reçus : `searchParams` d'une page Next.js, ou URLSearchParams. */
export type ParametresRecus = URLSearchParams | Readonly<Record<string, string | readonly string[] | undefined>>;

export type RaisonRefus = "format" | "signature" | "expire" | "montant";

export type VerificationLien = { valide: true; lien: LienPaiement } | { valide: false; raison: RaisonRefus };

/** Valeur unique d'un paramètre ; `null` s'il manque ou s'il est répété (lien ambigu). */
function lire(params: ParametresRecus, cle: string): string | null {
  if (params instanceof URLSearchParams) {
    const valeurs = params.getAll(cle);
    return valeurs.length === 1 ? valeurs[0]! : null;
  }
  const valeur = params[cle];
  return typeof valeur === "string" ? valeur : null;
}

/** SHA-256 en base64url, sans remplissage : 43 caractères. */
const FORMAT_SIGNATURE = /^[\w-]{43}$/;
const FORMAT_EXPIRATION = /^\d{1,12}$/;

/**
 * Vérifie un lien reçu. Dans l'ordre : forme des champs (« format »),
 * montant (« montant »), signature (« signature »), puis expiration
 * (« expire »). Les paramètres inconnus (fbclid, utm_…) sont ignorés.
 * Lève `SecretLienInvalide` si le secret manque.
 */
export function verifierLien(params: ParametresRecus, maintenant: Date, secret: string | undefined): VerificationLien {
  const cle = exigerSecret(secret);
  const ref = lire(params, "ref");
  const montant = lire(params, "montant");
  const libelle = lire(params, "libelle");
  const encaisseur = lire(params, "encaisseur");
  const exp = lire(params, "exp");
  const sig = lire(params, "sig");

  if (
    ref === null ||
    montant === null ||
    libelle === null ||
    exp === null ||
    sig === null ||
    !FORMAT_REFERENCE.test(ref) ||
    // Un lien généré contient toujours le libellé canonique.
    normaliserLibelle(libelle) !== libelle ||
    defautLibelle(libelle) !== null ||
    !estEncaisseur(encaisseur) ||
    !FORMAT_EXPIRATION.test(exp) ||
    !FORMAT_SIGNATURE.test(sig)
  ) {
    return { valide: false, raison: "format" };
  }

  const centimes = normaliserMontant(montant);
  if (centimes === null || !montantAutorise(centimes)) return { valide: false, raison: "montant" };

  const champs: ChampsSignes = { ref, centimes, libelle, encaisseur, exp: Number(exp) };
  if (!signaturesEgales(sig, calculerSignature(champs, cle))) return { valide: false, raison: "signature" };
  if (maintenant.getTime() >= champs.exp * 1000) return { valide: false, raison: "expire" };

  return { valide: true, lien: { ...champs, sig, chemin: construireChemin(champs, sig) } };
}
