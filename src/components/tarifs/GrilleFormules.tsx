"use client";

import Link from "next/link";
import { useState } from "react";
import { lienFormule } from "@/config/navigation";
import { FORMULES, GABARITS, duree, type Gabarit } from "@/data/offres";
import { IconeFleche } from "@/components/ui/Icones";
import { ChiffreRoulant } from "@/components/fx/ChiffreRoulant";
import { VoitureGabarits } from "@/components/fx/VoitureGabarits";
import type { Silhouette } from "@/components/fx/voiture/cadre-silhouette";

/**
 * Cartes des formules avec sélecteur de gabarit : la voiture se transforme et
 * les prix roulent jusqu'au gabarit choisi.
 */
export function GrilleFormules({ silhouettes }: { silhouettes: Record<Gabarit, Silhouette> }) {
  const [gabarit, setGabarit] = useState<Gabarit>("M");
  const info = GABARITS.find((g) => g.code === gabarit)!;

  return (
    <div>
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Votre gabarit</legend>
          <div className="grid grid-cols-3 gap-1 rounded-full border border-bord bg-texte/[0.04] p-1">
            {GABARITS.map((g) => (
              <label
                key={g.code}
                htmlFor={`grille-gabarit-${g.code}`}
                className="cursor-pointer rounded-full px-3 py-2.5 text-center text-sm font-semibold text-doux transition-colors hover:text-texte has-checked:bg-aqua has-checked:text-nuit has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
              >
                <input
                  id={`grille-gabarit-${g.code}`}
                  type="radio"
                  name="grille-gabarit"
                  value={g.code}
                  checked={gabarit === g.code}
                  onChange={() => setGabarit(g.code)}
                  className="sr-only"
                />
                <span className="font-titre">{g.code}</span> <span className="hidden sm:inline">· {g.libelleCourt}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-doux" aria-live="polite">
            {info.libelle}
            {info.exemples ? ` : ${info.exemples}` : ""}
          </p>
        </fieldset>
        <VoitureGabarits gabarit={gabarit} silhouettes={silhouettes} />
      </div>

      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {FORMULES.map((f) => (
          <li
            key={f.id}
            data-inclinaison
            className={`flex flex-col rounded-carte border p-6 sm:p-8 ${
              f.id === "complet" ? "border-aqua/50 bg-aqua/[0.07] shadow-eclat" : "border-bord bg-texte/[0.03]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-accent">{f.positionnement}</p>
                <h3 className="mt-1 font-sans text-2xl font-bold tracking-normal">{f.nom}</h3>
              </div>
              <p className="text-right">
                <ChiffreRoulant montant={f.prix[gabarit]} className="block font-titre text-5xl font-extrabold" />
                <span className="text-xs text-doux">{info.libelleCourt}</span>
              </p>
            </div>
            <p className="mt-3 text-sm text-doux">
              Sur place : {duree(f)}
              {f.sechage ? `, ${f.sechage}` : ""}
            </p>
            <div className="mt-6 grid flex-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold">Inclus</h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {f.inclus.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">
                        ✓
                      </span>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Non inclus</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-doux">
                  {f.nonInclus.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">–</span>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={`/reserver?f=${f.id}&g=${gabarit}`}
                data-magnetique
                className="reflet inline-flex min-h-11 items-center rounded-full bg-aqua px-5 text-sm font-semibold text-nuit"
              >
                Réserver {f.nom}
              </Link>
              <Link href={lienFormule(f)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                Détail <span className="sr-only">de {f.nom}</span>
                <IconeFleche className="size-4" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
