"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { depuisParametres } from "@/lib/devis-url";
import { formulaireInitial } from "@/lib/reservation/formulaire";
import { FormulaireReservation } from "./FormulaireReservation";

/**
 * Lit l'estimation transmise par le calculateur dans l'URL (f, g, o, ab,
 * f2…, c, code) et ouvre le formulaire prérempli. Rendu dans le navigateur
 * seulement (sous <Suspense>) : la page reste prérendue, statique.
 */
export function ReservationDepuisUrl() {
  const parametres = useSearchParams();
  const [initial] = useState(() => formulaireInitial(depuisParametres(new URLSearchParams(parametres.toString()))));
  return <FormulaireReservation initial={initial} />;
}
