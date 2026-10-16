/**
 * Cadre commun des silhouettes SVG, en centimètres (même échelle pour les
 * trois gabarits). Module sans three.js : importable côté navigateur.
 */
export const CADRE_SILHOUETTE = { x: -260, y: -10, largeur: 520, hauteur: 200 } as const;

export type Silhouette = {
  caisse: string;
  vitrage: string;
  toit: string;
  roues: { cx: number; cy: number; r: number }[];
};
