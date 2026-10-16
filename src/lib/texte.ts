/**
 * Normalise un texte pour les recherches : minuscules, sans accents,
 * ponctuation remplacée par des espaces, « st » développé en « saint ».
 */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .trim();
}

/** Vrai si `motCle` (déjà normalisé) apparaît comme mot entier dans `texteNormalise`. */
export function contientMot(texteNormalise: string, motCle: string): boolean {
  return ` ${texteNormalise} `.includes(` ${motCle} `);
}

/** Formate un montant en euros, sans décimales si elles sont nulles : « 119 € ». */
export function euros(montant: number): string {
  const entier = Number.isInteger(montant);
  return `${montant.toLocaleString("fr-FR", { minimumFractionDigits: entier ? 0 : 2, maximumFractionDigits: 2 })} €`;
}
