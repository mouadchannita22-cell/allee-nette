import type { CSSProperties } from "react";

/** Bulles fixes, réparties à la main : position (%), taille (px), vitesse de parallaxe. */
const BULLES = [
  { x: 6, y: 18, t: 18, v: 1.4 },
  { x: 14, y: 72, t: 10, v: 0.8 },
  { x: 27, y: 40, t: 6, v: 1.9 },
  { x: 41, y: 86, t: 14, v: 1.1 },
  { x: 58, y: 12, t: 8, v: 1.6 },
  { x: 69, y: 58, t: 22, v: 0.7 },
  { x: 81, y: 30, t: 9, v: 2 },
  { x: 92, y: 78, t: 16, v: 1.2 },
] as const;

/**
 * Bulles d'écume en parallaxe légère : elles glissent à des vitesses
 * différentes pendant le défilement (animation CSS pilotée par le défilement,
 * sans JavaScript). Navigateur sans prise en charge ou mouvement réduit :
 * bulles immobiles. Décoratif.
 */
export function BullesEcume() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {BULLES.map((b) => (
        <span
          key={`${b.x}-${b.y}`}
          className="bulle-ecume"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.t, height: b.t, "--vitesse": b.v } as CSSProperties}
        />
      ))}
    </div>
  );
}
