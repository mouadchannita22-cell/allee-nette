"use client";

import { useId, useState } from "react";
import { GABARITS, type Gabarit } from "@/data/offres";
import { devinerGabarit } from "@/lib/gabarit";

/** « Quel est mon gabarit ? » : le client tape son modèle, on sélectionne S, M ou L. */
export function AideGabarit({ onChoisir }: { onChoisir: (g: Gabarit, modele: string) => void }) {
  const id = useId();
  const [saisie, setSaisie] = useState("");
  const trouve = devinerGabarit(saisie);
  const info = trouve ? GABARITS.find((g) => g.code === trouve.gabarit) : undefined;

  return (
    <details className="group mt-3 rounded-xl border border-bord bg-texte/[0.03] open:bg-texte/[0.05]">
      <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-semibold text-accent [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mr-1 inline-block transition-transform group-open:rotate-90">
          ›
        </span>{" "}
        Quel est mon gabarit ?
      </summary>
      <div className="px-4 pb-4">
        <label htmlFor={id} className="mb-2 block text-sm">
          Tapez le modèle de votre voiture
        </label>
        <input
          id={id}
          type="text"
          value={saisie}
          placeholder="Par exemple : Peugeot 3008"
          onChange={(e) => {
            const valeur = e.target.value;
            setSaisie(valeur);
            const m = devinerGabarit(valeur);
            if (m) onChoisir(m.gabarit, m.modele);
          }}
          className="h-11 w-full rounded-xl border border-bord bg-texte/[0.04] px-4 text-base text-texte placeholder:text-doux/70"
          aria-describedby={`${id}-resultat`}
        />
        <p id={`${id}-resultat`} className="mt-2 min-h-5 text-sm text-doux" aria-live="polite">
          {trouve && info
            ? `${trouve.modele} : gabarit ${info.code} (${info.libelleCourt}), sélectionné pour vous.`
            : saisie.trim().length >= 2
              ? "Modèle non reconnu : choisissez le gabarit le plus proche, nous le confirmerons sur vos photos."
              : ""}
        </p>
      </div>
    </details>
  );
}
