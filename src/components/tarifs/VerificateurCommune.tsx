"use client";

import { useState } from "react";
import { suivre } from "@/lib/analytics";
import type { CommuneZonee } from "@/lib/zones";
import { ChampCommune, type EtatCommune } from "./ChampCommune";

/** « Êtes-vous dans notre zone ? » : le champ commune seul, hors calculateur. */
export function VerificateurCommune({ onCommune }: { onCommune?: (commune: CommuneZonee | null) => void } = {}) {
  const [etat, setEtat] = useState<EtatCommune>({ saisie: "", commune: null, inconnue: false });
  return (
    <ChampCommune
      libelle="Êtes-vous dans notre zone ?"
      valeur={etat}
      onChange={(e) => {
        if (!etat.saisie) suivre("calculateur_utilise", { outil: "zones" });
        setEtat(e);
        onCommune?.(e.commune);
      }}
    />
  );
}
