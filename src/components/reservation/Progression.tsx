"use client";

import { ETAPES_RESERVATION, type NumeroEtape } from "@/data/reservation";

type Props = {
  etape: NumeroEtape;
  /** Étape la plus avancée atteinte : on peut y revenir directement. */
  etapeMax: NumeroEtape;
  onAller: (etape: NumeroEtape) => void;
};

/** « Étape n sur 7 », avec les sept étapes : celles déjà vues se rouvrent d'un geste. */
export function Progression({ etape, etapeMax, onAller }: Props) {
  const total = ETAPES_RESERVATION.length;
  return (
    <nav aria-label="Étapes de la réservation">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
        Étape {etape} sur {total}
      </p>
      <ol className="mt-3 grid grid-cols-7 gap-1">
        {ETAPES_RESERVATION.map((nom, i) => {
          const n = (i + 1) as NumeroEtape;
          const etat = n === etape ? "en-cours" : n < etape || n <= etapeMax ? "vue" : "a-venir";
          const segment = (
            <>
              <span
                aria-hidden="true"
                className={`block h-1.5 w-full rounded-full ${n <= etape ? "bg-accent" : etat === "vue" ? "bg-accent/40" : "bg-texte/15"}`}
              />
              <span
                aria-hidden="true"
                className={`mt-2 hidden text-xs leading-tight group-hover:text-texte group-hover:underline md:block ${n === etape ? "font-semibold text-texte" : "text-doux"}`}
              >
                {nom}
              </span>
            </>
          );
          const libelle = `Étape ${n} : ${nom}${etat === "en-cours" ? " (étape en cours)" : ""}`;
          return (
            <li key={nom} className="min-w-0">
              {etat === "vue" ? (
                <button
                  type="button"
                  onClick={() => onAller(n)}
                  aria-label={`Revenir à l'étape ${n} : ${nom}`}
                  className="group flex min-h-11 w-full flex-col justify-start rounded-md pt-2.5 text-left"
                >
                  {segment}
                </button>
              ) : (
                <span
                  aria-current={etat === "en-cours" ? "step" : undefined}
                  className="flex min-h-11 flex-col justify-start pt-2.5"
                >
                  <span className="sr-only">{libelle}</span>
                  {segment}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
