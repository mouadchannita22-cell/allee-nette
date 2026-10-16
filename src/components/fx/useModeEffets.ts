"use client";

import { type RefObject, useEffect, useState } from "react";
import { detecterMode, type ModeEffets, pointeurGrossier } from "./capacites";

export type DecisionEffets = { mode: ModeEffets; tactile: boolean; affiche: boolean };

const MODES: readonly ModeEffets[] = ["complet", "degrade", "reduit"];

/** Rappelle `rappel` une fois la page chargée et le navigateur au repos. */
function apresChargement(rappel: () => void): () => void {
  let id: number | undefined;
  const auRepos = () => {
    id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(rappel, { timeout: 2500 })
        : window.setTimeout(rappel, 600);
  };
  if (document.readyState === "complete") auRepos();
  else window.addEventListener("load", auRepos, { once: true });
  return () => {
    window.removeEventListener("load", auRepos);
    if (id === undefined) return;
    if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id);
    else window.clearTimeout(id);
  };
}

/**
 * `?fx=complet|degrade|reduit` force un mode pour la recette ; `?affiche`
 * produit l'image de repli du héros (scripts/generer-affiche-heros.ts).
 */
function decider(): DecisionEffets {
  const parametres = new URLSearchParams(window.location.search);
  const affiche = parametres.has("affiche");
  const force = MODES.find((m) => m === parametres.get("fx"));
  return { mode: affiche ? "complet" : (force ?? detecterMode()), tactile: pointeurGrossier(), affiche };
}

/**
 * Niveau d'effets de l'appareil. `null` pendant le premier rendu et jusqu'au
 * chargement complet de la page : rien de décoratif ne retarde le contenu.
 */
export function useModeEffets(): DecisionEffets | null {
  const [decision, setDecision] = useState<DecisionEffets | null>(null);

  useEffect(() => {
    const annuler = apresChargement(() => setDecision(decider()));
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changer = () => setDecision(decider());
    requete.addEventListener("change", changer);
    return () => {
      annuler();
      requete.removeEventListener("change", changer);
    };
  }, []);

  return decision;
}

/** Vrai tant que l'élément est à l'écran et l'onglet visible : sinon, le rendu se met en pause. */
export function useVisible(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let dansEcran = true;
    const maj = () => setVisible(dansEcran && document.visibilityState === "visible");
    const observateur = new IntersectionObserver(([entree]) => {
      dansEcran = !!entree?.isIntersecting;
      maj();
    });
    observateur.observe(element);
    document.addEventListener("visibilitychange", maj);
    return () => {
      observateur.disconnect();
      document.removeEventListener("visibilitychange", maj);
    };
  }, [ref]);

  return visible;
}
