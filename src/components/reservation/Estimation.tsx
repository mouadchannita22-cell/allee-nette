"use client";

import type { ReactNode } from "react";
import { site } from "@/config/site";
import { formule as trouverFormule, type FormuleId } from "@/data/offres";
import { MENTION_ESTIMATION, type ResultatDevis } from "@/lib/prix";
import { euros } from "@/lib/texte";
import { ChiffreRoulant } from "@/components/fx/ChiffreRoulant";
import { LignesDevis, RemarquesDevis, useAnnonce } from "@/components/tarifs/AffichageDevis";
import { Bouton } from "@/components/ui/Bouton";

type PropsPanneau = {
  id: string;
  resultat: ResultatDevis;
  /** Commune indiquée : le déplacement est connu. */
  communeRenseignee: boolean;
  /** Zone 2 avec L'Intérieur Net : bascule vers une formule proposée. */
  onBasculer: (formule: FormuleId) => void;
};

/**
 * Total estimé, visible pendant tout le parcours : à côté du formulaire sur
 * ordinateur, sous le formulaire sur mobile (la barre du bas y mène).
 */
export function PanneauEstimation({ id, resultat, communeRenseignee, onBasculer }: PropsPanneau) {
  const annonce = useAnnonce(resultat);

  return (
    <aside
      id={id}
      aria-labelledby={`${id}-titre`}
      className="scroll-mt-28 rounded-carte border border-bord-champ bg-blanc p-6 shadow-douce lg:sticky lg:top-28"
    >
      <h2 id={`${id}-titre`} className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-accent">
        Votre estimation
      </h2>
      <p className="sr-only" aria-live="polite">
        {annonce}
      </p>

      {resultat.statut === "estimation" && (
        <>
          <p className="mt-3 font-titre text-5xl font-extrabold">
            <ChiffreRoulant montant={resultat.total} />
          </p>
          {resultat.aConfirmer && (
            <p className="mt-2 text-sm font-semibold text-avertissement">
              + {resultat.aConfirmer.min} à {resultat.aConfirmer.max} € à confirmer sur vos photos, hors total
            </p>
          )}
          <details open className="group mt-5 border-t border-bord pt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
              Détail ligne par ligne
              <span aria-hidden="true" className="text-accent transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <LignesDevis resultat={resultat} communeRenseignee={communeRenseignee} className="mt-2" />
          </details>
          <RemarquesDevis resultat={resultat} className="mt-5" />
        </>
      )}

      {resultat.statut === "refuse" && (
        <div className="mt-4">
          <p className="text-lg font-semibold">{resultat.message}.</p>
          <p className="mt-2 text-sm text-doux">
            L&apos;Intérieur Net seul n&apos;est pas proposé en zone 2. Changez de formule : le total s&apos;affiche aussitôt.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {resultat.formulesProposees.map((f) => (
              <Bouton key={f} variante={f === "complet" ? "primaire" : "secondaire"} onClick={() => onBasculer(f)}>
                Choisir {trouverFormule(f).nomCourt}
              </Bouton>
            ))}
          </div>
        </div>
      )}

      {resultat.statut === "sur-demande" && (
        <div className="mt-4">
          <p className="text-lg font-semibold">{resultat.message}.</p>
          <p className="mt-2 text-sm text-doux">
            Votre commune est hors de notre zone. Envoyez quand même votre demande : nous regardons ensemble si une
            tournée est possible, et vous confirmons le prix sur vos photos.
          </p>
        </div>
      )}

      {resultat.statut === "invalide" && <p className="mt-4 font-semibold text-avertissement">{resultat.message}</p>}

      <p className="mt-6 border-t border-bord pt-4 text-xs leading-relaxed text-doux">
        {MENTION_ESTIMATION} {site.mentionTva}.
      </p>
    </aside>
  );
}

/** Total court pour la barre du bas : montant, ou statut. */
function totalCourt(resultat: ResultatDevis) {
  switch (resultat.statut) {
    case "estimation":
      return <ChiffreRoulant montant={resultat.total} />;
    case "sur-demande":
      return "Sur demande";
    default:
      return "À revoir";
  }
}

/**
 * Boutons Retour et Continuer, avec le total estimé. Sur mobile et tablette,
 * barre collée en bas de l'écran : le total reste visible et les boutons ne
 * sont jamais recouverts, puisqu'ils sont dans la barre. Sur ordinateur, les
 * boutons reprennent leur place sous le formulaire (le total est à côté).
 */
export function BarreActions({ resultat, cible, children }: { resultat: ResultatDevis; cible: string; children: ReactNode }) {
  return (
    <div
      data-barre-estimation=""
      className="sticky bottom-0 z-10 -mx-2 mt-8 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:mt-10 lg:p-0"
    >
      <div className="rounded-2xl border border-bord-champ bg-blanc/95 p-2 shadow-[0_-12px_32px_-14px_rgb(11_18_32/0.35)] backdrop-blur-md lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <a href={`#${cible}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 lg:hidden">
          <span className="flex items-baseline gap-2">
            <span className="text-sm text-doux">Total estimé</span>
            <span className="font-titre text-lg font-extrabold tabular-nums">{totalCourt(resultat)}</span>
          </span>
          {resultat.statut === "estimation" && resultat.aConfirmer && (
            <span className="hidden text-xs text-doux min-[420px]:block">
              + {euros(resultat.aConfirmer.min)} à {euros(resultat.aConfirmer.max)} sur photos
            </span>
          )}
          <span className="text-sm font-semibold text-accent">
            Détail <span aria-hidden="true">↓</span>
          </span>
        </a>
        <div className="mt-1 flex items-center gap-2 lg:mt-0 lg:gap-3">{children}</div>
      </div>
    </div>
  );
}
