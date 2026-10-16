"use client";

import { OFFRES, option, type OptionId } from "@/data/offres";
import { ANIMAUX, ETATS_VEHICULE, MAX_VOITURES, SIEGES_ENFANT_MAX } from "@/data/reservation";
import { idChamp } from "@/lib/reservation/champs";
import { LONGUEURS, type ErreursChamps } from "@/lib/reservation/formulaire";
import type { VoitureFormulaire } from "@/lib/reservation/voiture";
import { messageAideGabarit } from "@/components/tarifs/AideGabarit";
import { ChoixGabarit, prixOption } from "@/components/tarifs/ChoixVehicule";
import { ChampTexte, GroupeChoix, type Choix } from "./Champs";

/** Identifiant du bouton « Ajouter une voiture » (le focus y revient quand on en retire une). */
export const ID_AJOUTER_VOITURE = "ajouter-voiture";

type Props = {
  voitures: readonly VoitureFormulaire[];
  erreurs: ErreursChamps;
  onModele: (index: number, modele: string) => void;
  onModifier: (index: number, maj: Partial<Pick<VoitureFormulaire, "gabarit" | "etat" | "animaux" | "siegesEnfant">>) => void;
  onAjouter: () => void;
  onRetirer: (index: number) => void;
};

/** Prix d'une option, pour la carte de la réponse qui la coche. */
function detailOption(id: OptionId | undefined): string | undefined {
  if (!id) return undefined;
  const opt = option(id);
  return opt.aConfirmerSurPhotos ? `${prixOption(opt)}, confirmé sur vos photos` : prixOption(opt);
}

const CHOIX_ETAT: Choix[] = ETATS_VEHICULE.map((e) => ({ id: e.id, libelle: e.libelle, detail: detailOption(e.option) }));
const CHOIX_ANIMAUX: Choix[] = ANIMAUX.map((a) => ({ id: a.id, libelle: a.libelle, detail: detailOption(a.option) }));
const CHOIX_SIEGES: Choix[] = Array.from({ length: SIEGES_ENFANT_MAX + 1 }, (_, n) => ({
  id: String(n),
  libelle: n === 0 ? "Aucun" : String(n),
}));

/** Étape 1 : modèle, gabarit, état, animaux et sièges enfants de chaque voiture. */
export function EtapeVoiture({ voitures, erreurs, onModele, onModifier, onAjouter, onRetirer }: Props) {
  const plusieurs = voitures.length > 1;
  const deux = OFFRES.deuxVoitures;

  return (
    <div className="space-y-6">
      {voitures.map((v, i) => {
        const cle = (champ: string) => `voitures.${i}.${champ}`;
        return (
          <fieldset key={i} className="space-y-7 rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
            <legend className="sr-only">{plusieurs ? `Voiture ${i + 1}` : "Votre voiture"}</legend>
            {plusieurs && (
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Voiture {i + 1}</h3>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onRetirer(i)}
                    className="min-h-11 px-2 text-sm font-semibold text-doux underline underline-offset-4 hover:text-texte"
                  >
                    Retirer<span className="sr-only"> la voiture {i + 1}</span>
                  </button>
                )}
              </div>
            )}

            <ChampTexte
              cle={cle("modele")}
              libelle="Modèle"
              valeur={v.modele}
              onChange={(modele) => onModele(i, modele)}
              erreur={erreurs[cle("modele")]}
              maxLength={LONGUEURS.modele}
              autoComplete="off"
              placeholder="Par exemple : Peugeot 3008"
              aide={messageAideGabarit(v.modele) || "Nous en déduisons le gabarit, que vous pouvez changer."}
              aideVivante
            />

            <ChoixGabarit
              nom={idChamp(`voitures.${i}`)}
              gabarit={v.gabarit}
              onChoisir={(gabarit) => onModifier(i, { gabarit })}
            />

            <GroupeChoix
              cle={cle("etat")}
              legende="État de l'habitacle"
              choix={CHOIX_ETAT}
              valeur={v.etat}
              onChange={(etat) => onModifier(i, { etat: etat as VoitureFormulaire["etat"] })}
              erreur={erreurs[cle("etat")]}
            />

            <GroupeChoix
              cle={cle("animaux")}
              legende="Des poils d'animaux ?"
              choix={CHOIX_ANIMAUX}
              valeur={v.animaux}
              onChange={(animaux) => onModifier(i, { animaux: animaux as VoitureFormulaire["animaux"] })}
              erreur={erreurs[cle("animaux")]}
            />

            <GroupeChoix
              cle={cle("siegesEnfant")}
              legende="Sièges enfants à nettoyer"
              aide={`${prixOption(option("siege-enfant"))}, démonté et nettoyé.`}
              choix={CHOIX_SIEGES}
              valeur={String(v.siegesEnfant)}
              onChange={(n) => onModifier(i, { siegesEnfant: Number(n) })}
              erreur={erreurs[cle("siegesEnfant")]}
              grille="grid-cols-2 min-[440px]:grid-cols-4"
            />
          </fieldset>
        );
      })}

      {voitures.length < MAX_VOITURES && (
        <button
          id={ID_AJOUTER_VOITURE}
          type="button"
          onClick={onAjouter}
          className="w-full rounded-carte border-2 border-dashed border-bord-champ px-5 py-4 text-left font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/5"
        >
          + Ajouter une voiture à la même adresse
          {deux.actif && (
            <span className="block text-sm font-normal text-doux">{deux.description}.</span>
          )}
        </button>
      )}
    </div>
  );
}
