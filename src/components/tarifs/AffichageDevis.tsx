"use client";

import { useEffect, useState } from "react";
import type { LigneDevis, ResultatDevis } from "@/lib/prix";
import { euros } from "@/lib/texte";

/**
 * Affichage d'une estimation (`calculerDevis`), partagé par le calculateur
 * et le formulaire de réservation : lignes, remarques, annonce aux lecteurs d'écran.
 */

/** Montant d'une ligne : « 119 € », « −15 € », « Offert », « Inclus », « +25 à 45 € ». */
export function montantLigne(l: LigneDevis): string {
  if (l.type === "offert") return "Offert";
  if (l.type === "a-confirmer" && l.fourchette) return `+${l.fourchette.min} à ${l.fourchette.max} €`;
  if (l.type === "deplacement" && l.montant === 0) return "Inclus";
  if (l.montant < 0) return `−${euros(-l.montant)}`;
  return euros(l.montant);
}

type Estimation = Extract<ResultatDevis, { statut: "estimation" }>;

/** Détail ligne par ligne. Tant que la commune n'est pas indiquée, le déplacement reste « selon votre commune ». */
export function LignesDevis({
  resultat,
  communeRenseignee,
  className = "",
}: {
  resultat: Estimation;
  communeRenseignee: boolean;
  className?: string;
}) {
  return (
    <ul className={`space-y-2.5 text-sm ${className}`}>
      {resultat.lignes.map((l, i) => (
        <li key={i} className="flex justify-between gap-4">
          <span className={l.type === "remise" || l.type === "offert" ? "text-accent" : "text-doux"}>
            {l.type === "deplacement" && !communeRenseignee ? "Déplacement : selon votre commune" : l.libelle}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {l.type === "deplacement" && !communeRenseignee ? "—" : montantLigne(l)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Options refusées (déjà incluses) et avertissements (code, météo…). Rien s'il n'y en a pas. */
export function RemarquesDevis({ resultat, className = "" }: { resultat: Estimation; className?: string }) {
  if (resultat.avertissements.length === 0 && resultat.optionsRefusees.length === 0) return null;
  return (
    <ul className={`space-y-2 text-sm text-doux ${className}`}>
      {resultat.optionsRefusees.map((r) => (
        <li key={`${r.vehicule}-${r.option}`}>• {r.raison}.</li>
      ))}
      {resultat.avertissements.map((a) => (
        <li key={a.code}>• {a.message}</li>
      ))}
    </ul>
  );
}

/** Texte annoncé aux lecteurs d'écran, différé pour ne pas répéter chaque frappe. */
export function useAnnonce(resultat: ResultatDevis): string {
  const texte =
    resultat.statut === "estimation"
      ? `Total estimé : ${euros(resultat.total)}`
      : resultat.statut === "invalide"
        ? resultat.message
        : `${resultat.message}.`;
  const [annonce, setAnnonce] = useState(texte);
  useEffect(() => {
    const t = setTimeout(() => setAnnonce(texte), 600);
    return () => clearTimeout(t);
  }, [texte]);
  return annonce;
}
