"use client";

import { QUESTION_CONNAISSANCE, SOURCES_CONNAISSANCE, type SourceConnaissance } from "@/data/reservation";
import type { EffetCode } from "@/lib/reservation/devis";
import { LONGUEURS, type DonneesFormulaire, type ErreursChamps } from "@/lib/reservation/formulaire";
import { montantLigne } from "@/components/tarifs/AffichageDevis";
import { ChampTexte, GroupeChoix } from "./Champs";

type Coordonnees = DonneesFormulaire["coordonnees"];

type Props = {
  coordonnees: Coordonnees;
  /** Effet du code sur l'estimation (`null` sans code). */
  effetCode: EffetCode | null;
  erreurs: ErreursChamps;
  onModifier: (maj: Partial<Coordonnees>) => void;
};

/** Ce que change le code, en une phrase : « Rue groupée (code VOISIN) : −10 €. » */
function texteEffet(effet: EffetCode | null): string {
  if (!effet) return "GARAGE, VOISIN ou code parrain (par exemple AN-2026-0042).";
  const lignes = effet.lignes.map((l) => `${l.libelle} : ${montantLigne(l)}.`);
  return [...lignes, ...effet.remarques].join(" ") || "Ce code ne change pas l'estimation.";
}

/** Étape 5 : prénom, téléphone, e-mail, « Comment nous avez-vous connus ? » et code éventuel. */
export function EtapeCoordonnees({ coordonnees, effetCode, erreurs, onModifier }: Props) {
  return (
    <div className="space-y-7 rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
      <ChampTexte
        cle="coordonnees.prenom"
        libelle="Prénom"
        valeur={coordonnees.prenom}
        onChange={(prenom) => onModifier({ prenom })}
        erreur={erreurs["coordonnees.prenom"]}
        maxLength={LONGUEURS.prenom}
        autoComplete="given-name"
      />
      <ChampTexte
        cle="coordonnees.telephone"
        libelle="Téléphone"
        type="tel"
        inputMode="tel"
        valeur={coordonnees.telephone}
        onChange={(telephone) => onModifier({ telephone })}
        erreur={erreurs["coordonnees.telephone"]}
        maxLength={LONGUEURS.telephone}
        autoComplete="tel"
        aide="Pour vous confirmer le prix et le créneau. Numéro français ou international (+32…)."
      />
      <ChampTexte
        cle="coordonnees.email"
        libelle="E-mail"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        valeur={coordonnees.email}
        onChange={(email) => onModifier({ email })}
        erreur={erreurs["coordonnees.email"]}
        maxLength={LONGUEURS.email}
        autoComplete="email"
        aide="Vous y recevez le récapitulatif de votre demande."
      />
      <GroupeChoix
        cle="coordonnees.connaissance"
        legende={QUESTION_CONNAISSANCE}
        facultatif
        choix={SOURCES_CONNAISSANCE}
        valeur={coordonnees.connaissance}
        onChange={(id) => onModifier({ connaissance: id as SourceConnaissance })}
        erreur={erreurs["coordonnees.connaissance"]}
        grille="grid-cols-2 sm:grid-cols-3"
      />
      <ChampTexte
        cle="coordonnees.code"
        libelle="Code"
        facultatif
        valeur={coordonnees.code}
        onChange={(code) => onModifier({ code: code.toUpperCase() })}
        erreur={erreurs["coordonnees.code"]}
        maxLength={LONGUEURS.code}
        autoComplete="off"
        autoCapitalize="characters"
        classeChamp="uppercase placeholder:normal-case sm:max-w-xs"
        placeholder="GARAGE, VOISIN…"
        aide={texteEffet(effetCode)}
        aideVivante
      />
    </div>
  );
}
