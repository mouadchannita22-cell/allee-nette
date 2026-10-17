"use client";

import { useEffect } from "react";
import { suivre } from "@/lib/analytics";

/** Paiements déjà comptés pendant la visite (protège aussi du double rendu en développement). */
const dejaComptes = new Set<string>();

/**
 * Événement `paiement_reussi`, une seule fois par paiement : seulement quand
 * le serveur a confirmé le paiement, et pas à chaque rechargement de la
 * page (mémoire du navigateur, sans donnée personnelle).
 */
export function MesurePaiementReussi({ identifiant, moyen }: { identifiant: string; moyen: "stripe" | "paypal" }) {
  useEffect(() => {
    if (dejaComptes.has(identifiant)) return;
    dejaComptes.add(identifiant);
    const cle = `paiement-reussi:${identifiant}`;
    try {
      if (localStorage.getItem(cle)) return;
      localStorage.setItem(cle, "1");
    } catch {
      // Stockage indisponible (navigation privée…) : la mémoire de la page suffit.
    }
    suivre("paiement_reussi", { moyen });
  }, [identifiant, moyen]);
  return null;
}
