import { isValidElement, type ReactNode } from "react";

/**
 * Identifiant d'ancre lisible, tiré d'un titre : minuscules, sans accents,
 * mots séparés par des tirets. « Droit de rétractation » → « droit-de-retractation ».
 */
export function ancre(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Texte brut d'un contenu React (titre MDX, éventuellement avec du gras ou un lien). */
export function texteBrut(noeud: ReactNode): string {
  if (typeof noeud === "string" || typeof noeud === "number") return String(noeud);
  if (Array.isArray(noeud)) return noeud.map(texteBrut).join("");
  if (isValidElement<{ children?: ReactNode }>(noeud)) return texteBrut(noeud.props.children);
  return "";
}
