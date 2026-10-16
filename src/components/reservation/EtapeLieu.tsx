"use client";

import { CONDITIONS } from "@/data/conditions";
import { DEPLACEMENT, formule as trouverFormule, type FormuleId, type ZoneTarif } from "@/data/offres";
import {
  QUESTION_PRISE,
  REPONSES_PRISE,
  TYPES_EMPLACEMENT,
  type ReponsePrise,
  type TypeEmplacement,
} from "@/data/reservation";
import { MESSAGE_HORS_ZONE, MESSAGE_METEO, MESSAGE_ZONE_2, type ResultatDevis } from "@/lib/prix";
import { idChamp } from "@/lib/reservation/champs";
import { LONGUEURS, type DonneesFormulaire, type ErreursChamps } from "@/lib/reservation/formulaire";
import { BadgeZone, ChampCommune, type EtatCommune } from "@/components/tarifs/ChampCommune";
import { Bouton } from "@/components/ui/Bouton";
import { ChampTexte, GroupeChoix } from "./Champs";
import { BlocDevis, MessageInfo } from "./Messages";

type Props = {
  lieu: DonneesFormulaire["lieu"];
  commune: EtatCommune;
  zone: ZoneTarif;
  resultat: ResultatDevis;
  /** Une voiture a de l'extérieur (Le Complet, ou l'option extérieur seul). */
  exterieur: boolean;
  erreurs: ErreursChamps;
  onAdresse: (adresse: string) => void;
  onCommune: (etat: EtatCommune) => void;
  onEmplacement: (emplacement: TypeEmplacement) => void;
  onPrise: (prise: ReponsePrise) => void;
  onBasculer: (formule: FormuleId) => void;
};

const TEXTE_ZONE: Record<ZoneTarif, string> = {
  zone1: "Déplacement inclus.",
  zone2: `Déplacement : +${DEPLACEMENT.zone2.supplement} €.`,
  "hors-zone": `${MESSAGE_HORS_ZONE}. Votre demande reste possible : nous regardons ensemble si une tournée est faisable.`,
};

/** Étape 3 : adresse, commune (zone calculée), emplacement et prise électrique. */
export function EtapeLieu({
  lieu,
  commune,
  zone,
  resultat,
  exterieur,
  erreurs,
  onAdresse,
  onCommune,
  onEmplacement,
  onPrise,
  onBasculer,
}: Props) {
  const communeConnue = Boolean(commune.commune) || commune.inconnue;
  const emplacement = TYPES_EMPLACEMENT.find((t) => t.id === lieu.emplacement);
  const prise = REPONSES_PRISE.find((r) => r.id === lieu.prise);

  return (
    <div className="space-y-8 rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
      <ChampTexte
        cle="lieu.adresse"
        libelle="Adresse d'intervention"
        valeur={lieu.adresse}
        onChange={onAdresse}
        erreur={erreurs["lieu.adresse"]}
        maxLength={LONGUEURS.adresse}
        autoComplete="address-line1"
        placeholder="Par exemple : 12 rue des Lilas"
        aide="Numéro et rue, là où se trouve la voiture."
      />

      <div className="space-y-3">
        <ChampCommune
          id={idChamp("lieu.commune")}
          libelle="Commune"
          valeur={commune}
          onChange={onCommune}
          requis
          erreur={erreurs["lieu.commune"]}
        />
        {communeConnue && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <BadgeZone zone={zone} />
            <span>{TEXTE_ZONE[zone]}</span>
          </p>
        )}
        {resultat.statut === "refuse" ? (
          <BlocDevis message={erreurs.devis ?? `${MESSAGE_ZONE_2}.`}>
            <p className="mt-2 text-sm">Changez la formule de la première voiture, ou revenez à l&apos;étape « Votre formule ».</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {resultat.formulesProposees.map((f) => (
                <Bouton key={f} variante={f === "complet" ? "primaire" : "secondaire"} onClick={() => onBasculer(f)}>
                  Choisir {trouverFormule(f).nomCourt}
                </Bouton>
              ))}
            </div>
          </BlocDevis>
        ) : (
          <BlocDevis message={erreurs.devis} />
        )}
      </div>

      <div>
        <GroupeChoix
          cle="lieu.emplacement"
          legende="Où se trouve la voiture ?"
          aide="Nous intervenons sur un emplacement privé, jamais sur la voie publique."
          choix={TYPES_EMPLACEMENT}
          valeur={lieu.emplacement}
          onChange={(id) => onEmplacement(id as TypeEmplacement)}
          erreur={erreurs["lieu.emplacement"]}
          grille="sm:grid-cols-2"
        />
        <MessageInfo className="mt-3">{emplacement?.message}</MessageInfo>
      </div>

      <div>
        <GroupeChoix
          cle="lieu.prise"
          legende={QUESTION_PRISE}
          aide={`Nous avons une rallonge de ${CONDITIONS.rallongeMetres} m. Pas besoin de point d'eau.`}
          choix={REPONSES_PRISE}
          valeur={lieu.prise}
          onChange={(id) => onPrise(id as ReponsePrise)}
          erreur={erreurs["lieu.prise"]}
        />
        <MessageInfo className="mt-3">{prise?.message}</MessageInfo>
      </div>

      {exterieur && <MessageInfo>{MESSAGE_METEO}</MessageInfo>}
    </div>
  );
}
