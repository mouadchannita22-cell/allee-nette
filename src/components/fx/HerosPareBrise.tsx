"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { connexionEconome } from "./capacites";
import { AfficheRepli } from "./pare-brise/AfficheRepli";
import type { EtatPinceau } from "./pare-brise/ScenePareBrise";
import { useModeEffets, useVisible } from "./useModeEffets";

// Module 3D (three.js) chargé à la demande, jamais pendant le premier rendu.
const ScenePareBrise = dynamic(() => import("./pare-brise/ScenePareBrise"), { ssr: false });

/**
 * Héros « pare-brise » : le visiteur regarde à travers une vitre sale qu'il
 * essuie du doigt ou de la souris. Purement décoratif : le titre, le texte et
 * les boutons sont du HTML posé par-dessus, lisible avant, pendant et sans l'effet.
 */
export function HerosPareBrise() {
  const conteneur = useRef<HTMLDivElement>(null);
  const pinceauRef = useRef<EtatPinceau>({ x: 0, y: 0, t: -1, nouveau: true });
  // Le niveau d'effets se décide après le chargement, pour ne pas retarder le titre.
  const decision = useModeEffets();
  // Rendu en pause quand le héros sort de l'écran ou que l'onglet est caché.
  const visible = useVisible(conteneur);
  const [pret, setPret] = useState(false);

  // Le pointeur essuie la vitre. Écoute passive : le défilement n'est jamais bloqué.
  const effetActif = decision?.mode === "complet";
  useEffect(() => {
    const section = conteneur.current?.parentElement;
    if (!section || !effetActif) return;
    const noter = (clientX: number, clientY: number) => {
      const r = section.getBoundingClientRect();
      const p = pinceauRef.current;
      p.x = (clientX - r.left) / r.width;
      p.y = 1 - (clientY - r.top) / r.height;
      p.t = performance.now();
    };
    const souris = (e: PointerEvent) => {
      if (e.pointerType !== "touch") noter(e.clientX, e.clientY);
    };
    const entree = () => {
      pinceauRef.current.nouveau = true;
    };
    const sortie = () => {
      pinceauRef.current.t = -1;
    };
    const toucher = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) noter(t.clientX, t.clientY);
    };
    const debutToucher = (e: TouchEvent) => {
      pinceauRef.current.nouveau = true;
      toucher(e);
    };
    section.addEventListener("pointermove", souris, { passive: true });
    section.addEventListener("pointerenter", entree, { passive: true });
    section.addEventListener("pointerleave", sortie, { passive: true });
    section.addEventListener("touchstart", debutToucher, { passive: true });
    section.addEventListener("touchmove", toucher, { passive: true });
    return () => {
      section.removeEventListener("pointermove", souris);
      section.removeEventListener("pointerenter", entree);
      section.removeEventListener("pointerleave", sortie);
      section.removeEventListener("touchstart", debutToucher);
      section.removeEventListener("touchmove", toucher);
    };
  }, [effetActif]);

  return (
    <div ref={conteneur} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {decision?.mode === "complet" ? (
        <div className="absolute inset-0 transition-opacity duration-700 ease-glisse" style={{ opacity: pret ? 1 : 0 }}>
          <ScenePareBrise
            actif={visible}
            pinceauRef={pinceauRef}
            tactile={decision.tactile}
            affiche={decision.affiche}
            onPret={() => setPret(true)}
          />
        </div>
      ) : decision && !connexionEconome() ? (
        <AfficheRepli gouttes={decision.mode === "degrade"} />
      ) : null}
    </div>
  );
}
