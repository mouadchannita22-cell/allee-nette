import type * as THREE from "three";
import type { Silhouette } from "./cadre-silhouette";
import { formesVoiture, PROFILS } from "./geometrie";

/**
 * Silhouettes de profil des trois gabarits, en chemins SVG, tirées des mêmes
 * formes que la voiture 3D. Calculées côté serveur : elles servent de repli
 * (mode dégradé, mouvement réduit) et s'affichent avant le chargement de la 3D.
 *
 * Unité : le centimètre ; même cadre pour les trois gabarits, pour que la
 * différence de taille se voie.
 */
/** Ordonnée SVG du sol : l'axe y du SVG descend, celui des formes monte. */
const SOL = 180;

function chemin(forme: THREE.Shape): string {
  const points = forme.getPoints(12);
  return (
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * 100).toFixed(1)} ${(SOL - p.y * 100).toFixed(1)}`)
      .join("") + "Z"
  );
}

/**
 * Mis en cache au build : three.js tire un identifiant aléatoire pour chaque
 * forme, ce que le pré-rendu de Next.js refuse hors d'un cache.
 */
export async function silhouettes(): Promise<Record<keyof typeof PROFILS, Silhouette>> {
  "use cache";
  const resultat = {} as Record<keyof typeof PROFILS, Silhouette>;
  for (const gabarit of Object.keys(PROFILS) as (keyof typeof PROFILS)[]) {
    const p = PROFILS[gabarit];
    const f = formesVoiture(p);
    const y = SOL - p.rayonRoue * 100;
    resultat[gabarit] = {
      caisse: chemin(f.caisse),
      vitrage: chemin(f.vitrage),
      toit: chemin(f.toit),
      roues: f.essieux.map((x) => ({ cx: Math.round(x * 100), cy: Math.round(y), r: Math.round(p.rayonRoue * 100) })),
    };
  }
  return resultat;
}
