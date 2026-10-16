"use client";

import { GABARITS, type FormuleId, type OptionId } from "@/data/offres";
import { idChamp } from "@/lib/reservation/champs";
import type { ErreursChamps } from "@/lib/reservation/formulaire";
import type { VoitureFormulaire } from "@/lib/reservation/voiture";
import { CaseAbonnement, ChoixFormule, ListeOptions } from "@/components/tarifs/ChoixVehicule";
import { BlocDevis } from "./Messages";

type Props = {
  voitures: readonly VoitureFormulaire[];
  erreurs: ErreursChamps;
  onFormule: (index: number, formule: FormuleId) => void;
  onAbonnement: (index: number, abonnement: boolean) => void;
  onOption: (index: number, option: OptionId, quantite: number) => void;
};

/**
 * Étape 2 : formule, abonnement et options de chaque voiture, avec les règles
 * du calculateur (options déjà incluses grisées, options exclusives).
 * Les réponses de l'étape 1 et les options restent d'accord dans les deux sens.
 */
export function EtapeFormule({ voitures, erreurs, onFormule, onAbonnement, onOption }: Props) {
  const plusieurs = voitures.length > 1;
  return (
    <div className="space-y-6">
      {voitures.map((v, i) => {
        const nom = idChamp(`voitures.${i}`);
        const gabarit = GABARITS.find((g) => g.code === v.gabarit);
        return (
          <fieldset key={i} className="rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
            <legend className="sr-only">{plusieurs ? `Voiture ${i + 1}` : "Votre voiture"}</legend>
            <p className="mb-5 text-sm text-doux">
              {plusieurs && <span className="mr-1 font-titre text-base font-bold text-texte">Voiture {i + 1} ·</span>}
              {v.modele.trim() || "Votre voiture"}, gabarit {v.gabarit}
              {gabarit ? ` (${gabarit.libelleCourt})` : ""}
            </p>

            <ChoixFormule nom={nom} formule={v.formule} gabarit={v.gabarit} onChoisir={(f) => onFormule(i, f)} />

            <CaseAbonnement
              className="mt-6"
              id={`${nom}-abonnement`}
              formule={v.formule}
              gabarit={v.gabarit}
              coche={v.abonnement}
              onChange={(coche) => onAbonnement(i, coche)}
            />

            <ListeOptions
              id={`${nom}-options`}
              className="mt-6"
              nom={nom}
              formule={v.formule}
              options={v.options}
              onBasculer={(option, quantite) => onOption(i, option, quantite)}
            />
          </fieldset>
        );
      })}
      <BlocDevis message={erreurs.devis} />
    </div>
  );
}
