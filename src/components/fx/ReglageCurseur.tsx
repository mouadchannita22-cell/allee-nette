"use client";

import { changerCurseur, useCurseurActive } from "./MicroInteractions";

/**
 * Interrupteur du curseur en bulle d'écume (pied de page). Affiché seulement
 * avec une souris : sur écran tactile, il n'y a pas de curseur à régler.
 */
export function ReglageCurseur() {
  const actif = useCurseurActive();
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={() => changerCurseur(!actif)}
      className="reglage-curseur hidden underline-offset-4 hover:text-texte hover:underline"
    >
      Curseur bulle : {actif ? "activé" : "désactivé"}
    </button>
  );
}
