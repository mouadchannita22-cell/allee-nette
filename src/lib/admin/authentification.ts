/**
 * Authentification HTTP Basic de l'administration (/admin/…, /api/admin/…).
 *
 * Utilisée par src/proxy.ts, qui peut tourner hors de Node.js (fonction
 * edge sur Netlify), puis revérifiée par la page et par la route de
 * génération : uniquement des API web standard (Web Crypto, atob,
 * TextEncoder), aucun module Node.
 *
 * - Mot de passe : variable ADMIN_PASSWORD, lue à l'exécution. L'identifiant
 *   est libre (par exemple « admin ») : seul le mot de passe compte.
 * - Comparaison en temps constant : on compare les empreintes SHA-256 des
 *   deux mots de passe (même longueur), octet par octet, sans sortie anticipée.
 * - Sans ADMIN_PASSWORD : 503 « Administration non configurée », jamais
 *   d'accès ouvert.
 * - Réponses jamais mises en cache ni indexées.
 */

export type EtatAuthentification = "autorise" | "refuse" | "non-configure";

/** Nom affiché par le navigateur dans sa fenêtre de connexion (ASCII : c'est un en-tête HTTP). */
export const DOMAINE_AUTHENTIFICATION = "Administration Allee Nette";

/** En-têtes de toutes les réponses de l'administration. */
export const ENTETES_ADMIN: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export const MESSAGE_NON_CONFIGURE = "Administration non configurée.";
export const MESSAGE_REFUSE = "Accès réservé aux associés d'Allée Nette : identifiant ou mot de passe requis.";

/** Identifiant et mot de passe d'un en-tête « Authorization: Basic … », ou `null` s'il est absent ou illisible. */
export function lireIdentifiants(entete: string | null | undefined): { identifiant: string; motDePasse: string } | null {
  const m = /^Basic +([A-Za-z0-9+/]+={0,2}) *$/i.exec(entete ?? "");
  if (!m) return null;
  let texte: string;
  try {
    const binaire = atob(m[1]!);
    texte = new TextDecoder().decode(Uint8Array.from(binaire, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
  // Le mot de passe peut contenir « : », pas l'identifiant.
  const separateur = texte.indexOf(":");
  if (separateur < 0) return null;
  return { identifiant: texte.slice(0, separateur), motDePasse: texte.slice(separateur + 1) };
}

async function empreinte(texte: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)));
}

/** Égalité de deux chaînes en temps constant (empreintes SHA-256 de 32 octets, comparées en entier). */
export async function egauxEnTempsConstant(a: string, b: string): Promise<boolean> {
  const [ea, eb] = await Promise.all([empreinte(a), empreinte(b)]);
  let difference = ea.length ^ eb.length;
  for (let i = 0; i < ea.length; i++) difference |= ea[i]! ^ (eb[i] ?? 0);
  return difference === 0;
}

/** Vérifie l'en-tête Authorization reçu contre le mot de passe attendu (ADMIN_PASSWORD). */
export async function verifierAuthentification(
  entete: string | null | undefined,
  motDePasseAttendu: string | undefined,
): Promise<EtatAuthentification> {
  const attendu = motDePasseAttendu?.trim() ?? "";
  if (attendu === "") return "non-configure";
  const identifiants = lireIdentifiants(entete);
  if (!identifiants) return "refuse";
  return (await egauxEnTempsConstant(identifiants.motDePasse, attendu)) ? "autorise" : "refuse";
}

/**
 * Réponse de refus : 401 avec la demande d'identifiants du navigateur, ou
 * 503 sans ADMIN_PASSWORD. En JSON pour les routes d'API, en texte sinon.
 */
export function reponseRefus(etat: Exclude<EtatAuthentification, "autorise">, format: "texte" | "json"): Response {
  const statut = etat === "non-configure" ? 503 : 401;
  const message = etat === "non-configure" ? MESSAGE_NON_CONFIGURE : MESSAGE_REFUSE;
  const entetes = new Headers(ENTETES_ADMIN);
  // Pas de demande d'identifiants tant que l'administration n'est pas configurée.
  if (statut === 401) entetes.set("WWW-Authenticate", `Basic realm="${DOMAINE_AUTHENTIFICATION}", charset="UTF-8"`);
  if (format === "json") return Response.json({ ok: false, message }, { status: statut, headers: entetes });
  entetes.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(message, { status: statut, headers: entetes });
}
