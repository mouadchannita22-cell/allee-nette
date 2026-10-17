import { estRenseigne } from "@/config/site";

/** Affiche la valeur, ou un emplacement visible « [À COMPLÉTER : libellé] ». */
export function ACompleter({ valeur, libelle }: { valeur?: string | null; libelle: string }) {
  if (estRenseigne(valeur)) return <>{valeur}</>;
  return <em className="a-completer">[À COMPLÉTER : {libelle}]</em>;
}

/** Règle encore à valider : emplacement visible « [À CONFIRMER : libellé] ». */
export function AConfirmer({ libelle }: { libelle: string }) {
  return <em className="a-completer">[À CONFIRMER : {libelle}]</em>;
}
