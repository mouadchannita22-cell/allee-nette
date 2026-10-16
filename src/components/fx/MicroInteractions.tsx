"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const CLE_CURSEUR = "allee-nette:curseur";
const EVENEMENT_CURSEUR = "allee-nette:curseur";
const CLIQUABLES = "a, button, input, select, textarea, label, summary, [role='slider'], [data-magnetique]";

/** Préférence « curseur bulle », gardée dans ce navigateur. Activé par défaut. */
export function curseurActive(): boolean {
  try {
    return localStorage.getItem(CLE_CURSEUR) !== "non";
  } catch {
    return true;
  }
}

export function changerCurseur(actif: boolean) {
  try {
    localStorage.setItem(CLE_CURSEUR, actif ? "oui" : "non");
  } catch {
    // Stockage indisponible (navigation privée) : réglage valable pour cette page seulement.
  }
  window.dispatchEvent(new CustomEvent(EVENEMENT_CURSEUR, { detail: actif }));
}

function abonnerCurseur(rappel: () => void) {
  window.addEventListener(EVENEMENT_CURSEUR, rappel);
  window.addEventListener("storage", rappel);
  return () => {
    window.removeEventListener(EVENEMENT_CURSEUR, rappel);
    window.removeEventListener("storage", rappel);
  };
}

/** Lecture réactive de la préférence (vraie côté serveur : rien n'est affiché avant l'hydratation). */
export function useCurseurActive(): boolean {
  return useSyncExternalStore(abonnerCurseur, curseurActive, () => true);
}

/** Souris (ou stylet) sur un appareil qui sait survoler, sans demande de mouvement réduit. */
function pointeurPrecis(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Micro-interactions réservées à la souris, branchées une seule fois pour tout
 * le site par délégation d'évènements :
 * - boutons `[data-magnetique]` qui attirent légèrement le pointeur ;
 * - cartes `[data-inclinaison]` qui s'inclinent en 3D avec un reflet ;
 * - curseur en bulle d'écume qui grossit sur les éléments cliquables
 *   (désactivable dans le pied de page ; le curseur normal reste visible).
 */
export function MicroInteractions() {
  const bulle = useRef<HTMLDivElement>(null);
  const bulleActive = useCurseurActive();

  // Boutons magnétiques et cartes inclinables.
  useEffect(() => {
    if (!pointeurPrecis()) return;
    let magnetique: HTMLElement | null = null;
    let carte: HTMLElement | null = null;

    const relacher = () => {
      magnetique?.style.removeProperty("translate");
      carte?.style.removeProperty("--incl-x");
      carte?.style.removeProperty("--incl-y");
      carte?.removeAttribute("data-survol");
      magnetique = carte = null;
    };

    const bouger = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const cible = e.target instanceof Element ? e.target : null;
      const m = cible?.closest<HTMLElement>("[data-magnetique]") ?? null;
      const c = cible?.closest<HTMLElement>("[data-inclinaison]") ?? null;
      if (m !== magnetique) magnetique?.style.removeProperty("translate");
      if (c !== carte) {
        carte?.style.removeProperty("--incl-x");
        carte?.style.removeProperty("--incl-y");
        carte?.removeAttribute("data-survol");
      }
      magnetique = m;
      carte = c;

      if (m) {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        m.style.translate = `${Math.max(-8, Math.min(8, dx * 0.16))}px ${Math.max(-6, Math.min(6, dy * 0.22))}px`;
      }
      if (c) {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        c.dataset.survol = "";
        c.style.setProperty("--incl-x", `${((0.5 - y) * 5).toFixed(2)}deg`);
        c.style.setProperty("--incl-y", `${((x - 0.5) * 7).toFixed(2)}deg`);
        c.style.setProperty("--reflet-x", `${(x * 100).toFixed(1)}%`);
        c.style.setProperty("--reflet-y", `${(y * 100).toFixed(1)}%`);
      }
    };

    document.addEventListener("pointermove", bouger, { passive: true });
    document.documentElement.addEventListener("pointerleave", relacher);
    return () => {
      relacher();
      document.removeEventListener("pointermove", bouger);
      document.documentElement.removeEventListener("pointerleave", relacher);
    };
  }, []);

  // Curseur en bulle d'écume : suit le pointeur avec un léger retard.
  useEffect(() => {
    const element = bulle.current;
    if (!element || !bulleActive || !pointeurPrecis()) return;
    let x = -100;
    let y = -100;
    let cibleX = -100;
    let cibleY = -100;
    let image = 0;

    const animer = () => {
      x += (cibleX - x) * 0.22;
      y += (cibleY - y) * 0.22;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      image = Math.abs(cibleX - x) + Math.abs(cibleY - y) > 0.3 ? requestAnimationFrame(animer) : 0;
    };
    const bouger = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cibleX = e.clientX;
      cibleY = e.clientY;
      element.dataset.visible = "";
      const cible = e.target instanceof Element ? e.target : null;
      element.toggleAttribute("data-cliquable", !!cible?.closest(CLIQUABLES));
      if (!image) image = requestAnimationFrame(animer);
    };
    const cacher = () => element.removeAttribute("data-visible");

    document.addEventListener("pointermove", bouger, { passive: true });
    document.documentElement.addEventListener("pointerleave", cacher);
    return () => {
      cancelAnimationFrame(image);
      cacher();
      document.removeEventListener("pointermove", bouger);
      document.documentElement.removeEventListener("pointerleave", cacher);
    };
  }, [bulleActive]);

  return bulleActive ? <div ref={bulle} aria-hidden="true" className="curseur-bulle" /> : null;
}
