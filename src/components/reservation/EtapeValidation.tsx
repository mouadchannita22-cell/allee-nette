"use client";

import type { ReactNode } from "react";
import { CASES_VALIDATION } from "@/data/reservation";
import type { DonneesFormulaire, ErreursChamps } from "@/lib/reservation/formulaire";
import { CaseACocher } from "./Champs";

type Validation = DonneesFormulaire["validation"];

type Props = {
  validation: Validation;
  erreurs: ErreursChamps;
  onCocher: (cle: keyof Validation, coche: boolean) => void;
  /** Récapitulatif complet, avec les liens « Modifier ». */
  recapitulatif: ReactNode;
};

/** Texte d'une case, avec son lien éventuel (ouvert dans un nouvel onglet : le formulaire reste rempli). */
function TexteCase({ cle }: { cle: keyof Validation }) {
  const { avant, lien, apres } = CASES_VALIDATION[cle];
  return (
    <>
      {avant}
      {lien && (
        <a href={lien.href} target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-4">
          {lien.texte}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
      {apres}
    </>
  );
}

const OBLIGATOIRES = ["cgv", "executionAnticipee", "donnees"] as const satisfies readonly (keyof Validation)[];

/** Étape 7 : récapitulatif, trois accords obligatoires et distincts, une case facultative pour nos offres. */
export function EtapeValidation({ validation, erreurs, onCocher, recapitulatif }: Props) {
  return (
    <div className="space-y-6">
      {recapitulatif}

      <fieldset className="rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
        <legend className="sr-only">Vos accords</legend>
        <h3 aria-hidden="true" className="font-sans text-base font-bold tracking-normal">
          Vos accords
        </h3>
        <p className="mt-1 text-sm text-doux">Les trois premières cases sont nécessaires pour envoyer votre demande.</p>
        <div className="mt-4 space-y-3">
          {OBLIGATOIRES.map((cle) => (
            <CaseACocher
              key={cle}
              cle={`validation.${cle}`}
              coche={validation[cle]}
              onChange={(coche) => onCocher(cle, coche)}
              erreur={erreurs[`validation.${cle}`]}
            >
              <TexteCase cle={cle} />
            </CaseACocher>
          ))}
        </div>
        <div className="mt-5 border-t border-bord pt-4">
          <CaseACocher
            cle="validation.offres"
            facultatif
            coche={validation.offres}
            onChange={(coche) => onCocher("offres", coche)}
            erreur={erreurs["validation.offres"]}
          >
            <TexteCase cle="offres" />
          </CaseACocher>
        </div>
      </fieldset>
    </div>
  );
}
