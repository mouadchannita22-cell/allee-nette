/**
 * Inventaire des emplacements « [À COMPLÉTER : …] » et « [À CONFIRMER : …] » :
 * fonctions pures partagées par `npm run a-completer` (scripts/a-completer.ts)
 * et par tests/unit/a-completer.test.ts. Aucune dépendance : le script tourne
 * avec Node seul.
 */

/**
 * Chemins des valeurs vides ("") d'un objet de configuration, par exemple
 * « site.associes.A.siren ». Les listes (communes…) ne sont pas parcourues.
 */
export function valeursVides(objet: unknown, chemin: string): string[] {
  if (typeof objet === "string") return objet.trim() === "" ? [chemin] : [];
  if (typeof objet !== "object" || objet === null || Array.isArray(objet)) return [];
  return Object.entries(objet).flatMap(([cle, valeur]) => valeursVides(valeur, `${chemin}.${cle}`));
}

/** Emplacements « [À COMPLÉTER : …] » et « [À CONFIRMER : …] » cités dans un texte, sans doublon. */
export function emplacementsCites(texte: string): string[] {
  return [...new Set([...texte.matchAll(/\[À (?:COMPLÉTER|CONFIRMER) : [^\]]+\]/g)].map((m) => m[0]))];
}

/** Texte d'une cellule de tableau Markdown, sans les accents graves du code. */
function cellule(texte: string): string {
  return texte.trim().replace(/`/g, "");
}

/**
 * Dernière colonne (« Où trouver l'information » ou « Comment le lever ») de
 * la ligne de docs/a-completer.md dont la première colonne cite `chemin`.
 * « idem » renvoie à la ligne précédente du même tableau. `null` si absent.
 */
export function ouTrouver(documentation: string, chemin: string): string | null {
  let precedente: string | null = null;
  for (const ligne of documentation.split("\n")) {
    if (!ligne.startsWith("|")) {
      precedente = null;
      continue;
    }
    const colonnes = ligne.split("|").slice(1, -1);
    const derniere = colonnes.length > 1 ? cellule(colonnes.at(-1)!) : "";
    const valeur: string | null = /^idem\.?$/i.test(derniere) ? precedente : derniere;
    if (cellule(colonnes[0] ?? "").split(" ")[0] === chemin) return valeur;
    precedente = valeur;
  }
  return null;
}
