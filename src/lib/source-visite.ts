/**
 * Source de la visite (partie 14 du brief, ajustement 4 du plan) : paramètres
 * UTM, code et domaine du site référent, captés à la première page vue et
 * gardés en mémoire du module pendant la visite. Ni cookie, ni localStorage,
 * ni sessionStorage : un rechargement complet repart de zéro.
 *
 * Ces informations partent avec la demande de réservation et figurent dans
 * l'e-mail aux associés. La redirection /garage (next.config.ts) arrive ici
 * avec code=GARAGE et utm_source=garage.
 */

/** Paramètre d'URL → clé de la source. */
const PARAMETRES = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_term: "utmTerm",
  utm_content: "utmContent",
  code: "code",
} as const;

export type CleSource = (typeof PARAMETRES)[keyof typeof PARAMETRES] | "referent";

export type SourceVisite = Partial<Record<CleSource, string>>;

/** Libellés pour l'e-mail aux associés, dans l'ordre d'affichage. */
export const LIBELLES_SOURCE: readonly { cle: CleSource; libelle: string }[] = [
  { cle: "utmSource", libelle: "Source (utm_source)" },
  { cle: "utmMedium", libelle: "Support (utm_medium)" },
  { cle: "utmCampaign", libelle: "Campagne (utm_campaign)" },
  { cle: "utmTerm", libelle: "Mot-clé (utm_term)" },
  { cle: "utmContent", libelle: "Contenu (utm_content)" },
  { cle: "code", libelle: "Code dans le lien" },
  { cle: "referent", libelle: "Site d'origine" },
];

const LONGUEUR_MAX = 100;
const LONGUEUR_CODE = 20;

/**
 * Ne garde que les clés connues, en texte court sur une ligne. Sert aussi
 * côté serveur : une source mal formée n'empêche jamais une demande.
 */
export function nettoyerSource(brut: unknown): SourceVisite {
  if (typeof brut !== "object" || brut === null) return {};
  const source: SourceVisite = {};
  for (const { cle } of LIBELLES_SOURCE) {
    const valeur = (brut as Record<string, unknown>)[cle];
    if (typeof valeur !== "string") continue;
    let texte = valeur.replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
    texte = cle === "code" ? texte.slice(0, LONGUEUR_CODE).toUpperCase() : texte.slice(0, LONGUEUR_MAX);
    if (texte) source[cle] = texte;
  }
  return source;
}

function sansWww(hote: string): string {
  return hote.toLowerCase().replace(/^www\./, "");
}

/** Domaine du site référent (sans chemin ni paramètres), sauf s'il s'agit du site lui-même. */
export function domaineReferent(referent: string, hoteSite: string): string | undefined {
  try {
    const url = new URL(referent);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return sansWww(url.hostname) === sansWww(hoteSite) ? undefined : url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/** Source d'une visite à partir de l'adresse de la page et de `document.referrer`. Fonction pure. */
export function extraireSource(adresse: string, referent: string, hoteSite: string): SourceVisite {
  let parametres: URLSearchParams;
  try {
    parametres = new URL(adresse).searchParams;
  } catch {
    parametres = new URLSearchParams();
  }
  const brut: Record<string, string | undefined> = { referent: domaineReferent(referent, hoteSite) };
  for (const [parametre, cle] of Object.entries(PARAMETRES)) {
    const valeur = parametres.get(parametre);
    if (valeur) brut[cle] = valeur;
  }
  return nettoyerSource(brut);
}

// ---------------------------------------------------------------------------
// Mémoire de la visite (navigateur uniquement)
// ---------------------------------------------------------------------------

let sourceVisite: SourceVisite | null = null;

/** À appeler une fois, à la première page vue. Les appels suivants ne changent rien. */
export function capterSourceVisite(): void {
  if (sourceVisite !== null || typeof window === "undefined") return;
  sourceVisite = extraireSource(window.location.href, document.referrer, window.location.hostname);
}

/** Source captée pendant la visite (vide si rien n'a été capté). */
export function lireSourceVisite(): SourceVisite {
  return { ...sourceVisite };
}

/** Oublie la source captée (tests). */
export function oublierSourceVisite(): void {
  sourceVisite = null;
}
