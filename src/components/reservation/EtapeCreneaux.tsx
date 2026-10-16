"use client";

import { CRENEAUX_PROPOSES, REGLES_CRENEAUX } from "@/data/reservation";
import { idChamp, idErreur } from "@/lib/reservation/champs";
import type { Creneau } from "@/lib/reservation/creneaux";
import type { ErreursChamps } from "@/lib/reservation/formulaire";
import { classesChamp, MessageErreur } from "./Champs";

type Props = {
  /** Créneaux proposés, calculés dans le navigateur à l'heure de Paris. */
  disponibles: readonly Creneau[];
  choisis: readonly string[];
  erreurs: ErreursChamps;
  onChoisir: (rang: number, creneau: string) => void;
};

const RANGS = ["Premier", "Deuxième", "Troisième", "Quatrième", "Cinquième"];

/** « Premier choix », « Deuxième choix »… */
function libelleRang(rang: number): string {
  return `${RANGS[rang] ?? `${rang + 1}e`} choix`;
}

/** « mercredi après-midi, samedi matin ou samedi après-midi », d'après les créneaux configurés. */
function creneauxEnTexte(): string {
  const libelles = CRENEAUX_PROPOSES.map((c) => c.libelle.toLowerCase());
  return libelles.length > 1 ? `${libelles.slice(0, -1).join(", ")} ou ${libelles.at(-1)}` : (libelles[0] ?? "");
}

/** Étape 4 : trois créneaux souhaités, par ordre de préférence ; le premier est obligatoire. */
export function EtapeCreneaux({ disponibles, choisis, erreurs, onChoisir }: Props) {
  const { horizonSemaines, delaiMinimumJours } = REGLES_CRENEAUX;
  const debut = delaiMinimumJours <= 1 ? "à partir de demain" : `à partir du ${delaiMinimumJours}e jour`;
  return (
    <div className="rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
      <p className="text-doux">
        Créneaux proposés : {creneauxEnTexte()}, {debut} et sur {horizonSemaines} semaines. Indiquez-en jusqu&apos;à{" "}
        {REGLES_CRENEAUX.nombreDemandes}, du préféré au moins pratique : nous vous confirmons le créneau avec le prix ferme.
      </p>
      <div className="mt-6 space-y-5">
        {Array.from({ length: REGLES_CRENEAUX.nombreDemandes }, (_, rang) => {
          const cle = `creneaux.${rang}`;
          const valeur = choisis[rang] ?? "";
          const facultatif = rang >= REGLES_CRENEAUX.minimum;
          const erreur = erreurs[cle];
          return (
            <div key={rang}>
              <label htmlFor={idChamp(cle)} className="mb-2 block font-semibold">
                {libelleRang(rang)}
                {facultatif && <span className="font-normal text-doux"> (facultatif)</span>}
              </label>
              <select
                id={idChamp(cle)}
                name={idChamp(cle)}
                value={valeur}
                onChange={(e) => onChoisir(rang, e.target.value)}
                required={!facultatif}
                aria-invalid={erreur ? true : undefined}
                aria-describedby={erreur ? idErreur(cle) : undefined}
                className={`${classesChamp} pr-10`}
              >
                <option value="">{facultatif ? "Pas d'autre créneau" : "Choisissez un créneau"}</option>
                {disponibles.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id !== valeur && choisis.includes(c.id)}>
                    {c.libelle}
                  </option>
                ))}
              </select>
              <MessageErreur cle={cle} message={erreur} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
