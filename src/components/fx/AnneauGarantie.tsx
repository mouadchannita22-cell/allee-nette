import type { CSSProperties, ReactNode } from "react";

/**
 * Anneau de minuterie de la garantie Retouche : 24 graduations, un arc qui se
 * remplit une fois au passage (<AuPassage>), une perle qui en suit la tête.
 * Sans JavaScript ou en mouvement réduit : anneau plein et fixe. Décoratif ;
 * le texte au centre reste du HTML.
 */
export function AnneauGarantie({ heures, children }: { heures: number; children: ReactNode }) {
  return (
    <div className="anneau-garantie relative mx-auto aspect-square w-full max-w-72">
      <svg aria-hidden="true" viewBox="0 0 240 240" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="120" cy="120" r="104" fill="none" stroke="rgb(243 250 252 / 0.1)" strokeWidth="10" />
        {Array.from({ length: heures }, (_, i) => {
          const angle = (i / heures) * 2 * Math.PI;
          const quart = i % (heures / 4) === 0;
          const r1 = quart ? 78 : 83;
          return (
            <line
              key={i}
              className="graduation"
              x1={120 + Math.cos(angle) * r1}
              y1={120 + Math.sin(angle) * r1}
              x2={120 + Math.cos(angle) * 91}
              y2={120 + Math.sin(angle) * 91}
              stroke="#2ee6d6"
              strokeWidth={quart ? 3 : 1.6}
              strokeLinecap="round"
              style={{ "--i": i } as CSSProperties}
            />
          );
        })}
        <circle
          className="arc"
          cx="120"
          cy="120"
          r="104"
          fill="none"
          stroke="#2ee6d6"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
        />
        <g className="tete">
          <circle cx="224" cy="120" r="9" fill="#f3fafc" />
          <circle cx="224" cy="120" r="14" fill="#2ee6d6" opacity="0.35" />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center font-titre">{children}</div>
    </div>
  );
}
