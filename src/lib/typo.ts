const INSECABLE = " ";

/**
 * Typographie française : espace insécable avant ? ! : ; et », après «,
 * et entre un nombre et son unité (« 20 km », « 59 € », « 2 h 30 »).
 * Évite un « ? » ou un « km » seul en début de ligne.
 */
export function fr(texte: string): string {
  return texte
    .replace(/ ([?!:;»])/g, `${INSECABLE}$1`)
    .replace(/« /g, `«${INSECABLE}`)
    .replace(/(\d) (?=(?:km|€|h|m|min|minutes|litres|heures|mois|ans|%|véhicules|communes)\b|€)/g, `$1${INSECABLE}`);
}

/** Applique `fr` si la valeur est une chaîne, sinon la renvoie telle quelle. */
export function frSiTexte<T>(valeur: T): T | string {
  return typeof valeur === "string" ? fr(valeur) : valeur;
}
