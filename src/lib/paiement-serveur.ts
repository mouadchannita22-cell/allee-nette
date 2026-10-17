/**
 * Liens de paiement signés, côté serveur : lit le secret dans
 * l'environnement et appelle les fonctions pures de lib/paiement.ts.
 *
 * Variable d'environnement, lue à l'exécution (jamais recopiée au build ni
 * envoyée au navigateur) : PAYMENT_LINK_SECRET, 32 caractères au moins.
 * Changer le secret invalide tous les liens déjà envoyés.
 */
import "server-only";
import { site } from "@/config/site";
import {
  SecretLienInvalide,
  creerLien,
  secretSuffisant,
  verifierLien,
  type DonneesLien,
  type LienPaiement,
  type ParametresRecus,
  type VerificationLien,
} from "./paiement";

/** Secret des liens, tel que lu dans l'environnement (vérifié par les fonctions de lib/paiement.ts). */
function secret(): string | undefined {
  return process.env.PAYMENT_LINK_SECRET?.trim() || undefined;
}

/** Vrai si PAYMENT_LINK_SECRET est présent et assez long. */
export function liensPaiementConfigures(): boolean {
  return secretSuffisant(secret());
}

export type LienGenere = {
  /** URL absolue, sur l'adresse publique du site (NEXT_PUBLIC_SITE_URL). */
  url: string;
  /** Fin de validité. */
  expireLe: Date;
  lien: LienPaiement;
};

/**
 * Génère un lien signé, valable 7 jours. Lève `SecretLienInvalide` si le
 * secret manque, `RangeError` si une donnée est invalide (à vérifier avant
 * avec `verifierDonneesLien`).
 */
export function genererLienPaiement(donnees: DonneesLien, maintenant = new Date()): LienGenere {
  const lien = creerLien(donnees, maintenant, secret());
  return { url: `${site.url}${lien.chemin}`, expireLe: new Date(lien.exp * 1000), lien };
}

/**
 * Vérifie un lien reçu par la page /paiement ou par une route de paiement.
 * Ne lève jamais d'erreur : sans secret, renvoie la raison « configuration »
 * (paiement en ligne indisponible), journalisée sans le secret.
 */
export function verifierLienPaiement(
  params: ParametresRecus,
  maintenant = new Date(),
): VerificationLien | { valide: false; raison: "configuration" } {
  try {
    return verifierLien(params, maintenant, secret());
  } catch (erreur) {
    if (erreur instanceof SecretLienInvalide) {
      console.error(`[paiement] ${erreur.message}`);
      return { valide: false, raison: "configuration" };
    }
    throw erreur;
  }
}
