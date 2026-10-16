"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useModeEffets, useVisible } from "./useModeEffets";
import { CADRE_SILHOUETTE, type Silhouette } from "./voiture/cadre-silhouette";
import type { Gabarit } from "./voiture/VoitureAnimee";

// Module 3D chargé à la demande, une fois la page chargée.
const SceneGabarits = dynamic(() => import("./voiture/SceneGabarits"), { ssr: false });

const VUE = `${CADRE_SILHOUETTE.x} ${CADRE_SILHOUETTE.y} ${CADRE_SILHOUETTE.largeur} ${CADRE_SILHOUETTE.hauteur}`;

/** Silhouettes des trois gabarits, qui se fondent l'une dans l'autre. */
function Silhouettes({ gabarit, silhouettes }: { gabarit: Gabarit; silhouettes: Record<Gabarit, Silhouette> }) {
  return (
    <svg viewBox={VUE} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="carrosserie-silhouette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ff1e4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#19c3b1" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <ellipse cx="0" cy="181" rx="250" ry="7" fill="#000" opacity="0.35" />
      {(Object.keys(silhouettes) as Gabarit[]).map((g) => {
        const s = silhouettes[g];
        return (
          <g
            key={g}
            className="transition-opacity duration-500 ease-glisse"
            style={{ opacity: g === gabarit ? 1 : 0 }}
          >
            <path d={s.caisse} fill="url(#carrosserie-silhouette)" stroke="#2ee6d6" strokeWidth="1.6" />
            <path d={s.vitrage} fill="#0b1220" stroke="#2ee6d6" strokeOpacity="0.5" strokeWidth="1.2" />
            <path d={s.toit} fill="#2ee6d6" opacity="0.35" />
            {s.roues.map((r) => (
              <g key={r.cx}>
                <circle cx={r.cx} cy={r.cy} r={r.r} fill="#0b1220" stroke="#2ee6d6" strokeWidth="1.6" />
                <circle cx={r.cx} cy={r.cy} r={r.r * 0.55} fill="none" stroke="#9aa8ba" strokeWidth="1.2" />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Voiture du gabarit choisi sur la page Tarifs : en 3D quand l'appareil le
 * permet (elle se transforme d'un gabarit à l'autre), en silhouettes SVG sinon
 * et en attendant la 3D. Purement décoratif : le choix se fait au clavier
 * comme à la souris dans le sélecteur, juste à côté.
 */
export function VoitureGabarits({ gabarit, silhouettes }: { gabarit: Gabarit; silhouettes: Record<Gabarit, Silhouette> }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const decision = useModeEffets();
  const visible = useVisible(conteneur);
  const [pret, setPret] = useState(false);
  const complet = decision?.mode === "complet";

  return (
    <div ref={conteneur} aria-hidden="true" className="relative aspect-[2/1] w-full">
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: complet && pret ? 0 : 1 }}>
        <Silhouettes gabarit={gabarit} silhouettes={silhouettes} />
      </div>
      {complet ? (
        <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: pret ? 1 : 0 }}>
          <SceneGabarits gabarit={gabarit} actif={visible} onPret={() => setPret(true)} />
        </div>
      ) : null}
    </div>
  );
}
