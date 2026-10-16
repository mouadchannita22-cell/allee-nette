"use client";

import type { Ref } from "react";
import { cibleErreur } from "@/lib/reservation/champs";
import type { ErreursChamps } from "@/lib/reservation/formulaire";
import { PastilleErreur } from "./Champs";

type Props = {
  id: string;
  erreurs: ErreursChamps;
  /** Précision devant un message (« Voiture 2 : »), selon la clé du champ. */
  prefixe?: (cle: string) => string;
  /** Si l'élément visé n'existe pas, le focus revient ici (titre de l'étape). */
  repli: string;
  ref?: Ref<HTMLDivElement>;
};

/** Amène le focus sur un champ (le navigateur le fait défiler jusqu'à lui). */
function allerAuChamp(cle: string, repli: string) {
  const cible = document.getElementById(cibleErreur(cle)) ?? document.getElementById(repli);
  cible?.focus();
}

/**
 * Résumé des erreurs d'une étape, annoncé aux lecteurs d'écran (role=alert),
 * avec un lien vers chaque champ à corriger.
 */
export function ResumeErreurs({ id, erreurs, prefixe, repli, ref }: Props) {
  const entrees = Object.entries(erreurs);
  if (entrees.length === 0) return null;
  return (
    <div
      ref={ref}
      id={id}
      tabIndex={-1}
      role="alert"
      aria-labelledby={`${id}-titre`}
      className="mt-6 rounded-2xl border-2 border-avertissement bg-blanc p-5"
    >
      <h3 id={`${id}-titre`} className="flex items-center gap-2 font-sans text-base font-bold tracking-normal text-avertissement">
        <PastilleErreur />
        {entrees.length > 1 ? `${entrees.length} réponses à compléter` : "Une réponse à compléter"}
      </h3>
      <ul className="mt-3 space-y-1">
        {entrees.map(([cle, message]) => (
          <li key={cle}>
            <a
              href={`#${cibleErreur(cle)}`}
              onClick={(e) => {
                e.preventDefault();
                allerAuChamp(cle, repli);
              }}
              className="inline-flex min-h-11 items-center font-semibold text-texte underline decoration-avertissement decoration-2 underline-offset-4"
            >
              {prefixe?.(cle)}
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
