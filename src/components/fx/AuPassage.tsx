"use client";

import { type ComponentProps, useEffect, useRef } from "react";

/**
 * Joue une fois les animations CSS de son contenu quand il entre à l'écran.
 *
 * L'attribut `data-vu` est posé dans le navigateur seulement : « false » au
 * montage (état de départ de l'animation), « true » au premier passage à
 * l'écran. Sans JavaScript, l'attribut est absent et le contenu s'affiche
 * directement dans son état final.
 */
export function AuPassage({ seuil = 0.4, ...props }: { seuil?: number } & ComponentProps<"div">) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cible = element.current;
    if (!cible) return;
    cible.dataset.vu = "false";
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree?.isIntersecting) return;
        cible.dataset.vu = "true";
        observateur.disconnect();
      },
      { threshold: seuil },
    );
    observateur.observe(cible);
    return () => observateur.disconnect();
  }, [seuil]);

  return <div ref={element} {...props} />;
}
