/**
 * Réglages du script de mesure d'audience Umami (sans cookie), lus au build.
 * Le script lui-même est chargé par components/layout/MesureAudience.tsx ;
 * les événements partent par lib/analytics.ts. Mode d'emploi :
 * docs/mesure-audience.md.
 */

/** Script d'Umami Cloud, utilisé quand NEXT_PUBLIC_UMAMI_SRC est vide. */
export const SRC_UMAMI_PAR_DEFAUT = "https://cloud.umami.is/script.js";

/**
 * Nom de la fonction globale qu'Umami appelle avant chaque envoi
 * (attribut `data-before-send`) : elle retire ce qui ne doit pas partir.
 */
export const NOM_FILTRE_UMAMI = "alleeNetteFiltreUmami";

export type ConfigurationUmami = {
  /** Identifiant du site dans Umami (public). */
  idSite: string;
  /** Adresse du script de suivi. */
  src: string;
  /** Domaine compté (`data-domains`) : les aperçus et le local ne le sont pas. */
  domaine: string;
};

/**
 * Configuration du script, ou `null` si la mesure n'est pas activée
 * (identifiant absent) : alors aucun script n'est chargé.
 */
export function configurationUmami(
  idSite: string | undefined,
  src: string | undefined,
  urlSite: string,
): ConfigurationUmami | null {
  const id = idSite?.trim();
  if (!id) return null;
  let domaine: string;
  try {
    domaine = new URL(urlSite).hostname;
  } catch {
    return null;
  }
  return { idSite: id, src: src?.trim() || SRC_UMAMI_PAR_DEFAUT, domaine };
}

/** Paramètres de campagne gardés dans l'adresse envoyée à Umami : rien d'autre. */
const PARAMETRES_CAMPAGNE = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/** Pages jamais mesurées. */
const CHEMINS_EXCLUS = ["/admin"];

/** Adresse sans paramètres ni ancre : « /reserver/merci?ref=… » devient « /reserver/merci ». */
function sansParametres(adresse: string): string {
  return adresse.split(/[?#]/, 1)[0] ?? "";
}

/**
 * Filtre appliqué à chaque envoi vers Umami (pages vues et événements) :
 * - rien n'est envoyé depuis l'administration ;
 * - l'adresse de la page perd ses paramètres (référence de la demande, lien
 *   de paiement signé, identifiant de session Stripe…) sauf les paramètres
 *   UTM de la page en cours ;
 * - le site d'origine perd lui aussi ses paramètres.
 *
 * `adresse` est l'adresse complète de la page (`location.href`). Renvoie
 * `null` pour annuler l'envoi. Fonction pure, testée dans tests/unit.
 */
export function preparerEnvoiUmami<T>(charge: T, adresse: string): T | null {
  let page: URL;
  try {
    page = new URL(adresse);
  } catch {
    return null;
  }
  if (CHEMINS_EXCLUS.some((c) => page.pathname === c || page.pathname.startsWith(`${c}/`))) return null;
  if (typeof charge !== "object" || charge === null) return charge;

  const resultat: Record<string, unknown> = { ...(charge as Record<string, unknown>) };
  if (typeof resultat.url === "string") {
    const campagne = new URLSearchParams();
    for (const nom of PARAMETRES_CAMPAGNE) {
      const valeur = page.searchParams.get(nom)?.trim();
      if (valeur) campagne.set(nom, valeur.slice(0, 100));
    }
    const suite = campagne.toString();
    resultat.url = `${sansParametres(resultat.url)}${suite ? `?${suite}` : ""}`;
  }
  if (typeof resultat.referrer === "string") resultat.referrer = sansParametres(resultat.referrer);
  return resultat as T;
}
