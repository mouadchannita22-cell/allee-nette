import { type ReactNode, ViewTransition } from "react";

/**
 * Transition entre les pages : la nouvelle page monte comme une vague, la
 * précédente s'efface (API View Transitions, styles dans globals.css).
 * Navigateur sans prise en charge, ou mouvement réduit : changement immédiat.
 *
 * Un template est remonté à chaque navigation, contrairement au layout : c'est
 * ce qui déclenche l'entrée et la sortie.
 */
export default function Gabarit({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="vague-entree" exit="vague-sortie" default="none">
      {/* Un seul conteneur : une seule vague pour toute la page, pas une par section. */}
      <div>{children}</div>
    </ViewTransition>
  );
}
