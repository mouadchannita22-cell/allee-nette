"use client";

import { useState } from "react";
import { suivre } from "@/lib/analytics";
import { ChampCommune, type EtatCommune } from "./ChampCommune";

/** « Êtes-vous dans notre zone ? » : le champ commune seul, hors calculateur. */
export function VerificateurCommune() {
  const [etat, setEtat] = useState<EtatCommune>({ saisie: "", commune: null, inconnue: false });
  return (
    <ChampCommune
      libelle="Êtes-vous dans notre zone ?"
      valeur={etat}
      onChange={(e) => {
        if (!etat.saisie) suivre("calculateur_utilise", { source: "zones" });
        setEtat(e);
      }}
    />
  );
}
