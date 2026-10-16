import type { ReactNode } from "react";
import { idChamp } from "@/lib/reservation/champs";
import { PastilleErreur } from "./Champs";

/** Identifiant du bloc qui explique un blocage de l'estimation (cible du résumé d'erreurs). */
export const ID_BLOC_DEVIS = idChamp("devis");

/**
 * Message conditionnel (partie 9.2 du brief : copropriété, prise, météo…).
 * Annoncé poliment quand il apparaît.
 */
export function MessageInfo({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div aria-live="polite" className={className}>
      {children && (
        <p className="flex gap-3 rounded-2xl border border-accent/40 bg-accent/[0.07] px-4 py-3 text-sm">
          <span aria-hidden="true" className="mt-px font-bold text-accent">
            i
          </span>
          <span>{children}</span>
        </p>
      )}
    </div>
  );
}

/** Blocage de l'estimation (commande minimale, zone 2 avec L'Intérieur Net…), sous les choix concernés. */
export function BlocDevis({ message, children }: { message?: string; children?: ReactNode }) {
  if (!message) return null;
  return (
    <div id={ID_BLOC_DEVIS} tabIndex={-1} className="rounded-2xl border-2 border-avertissement bg-blanc p-5">
      <p className="flex gap-2 font-semibold text-avertissement">
        <PastilleErreur />
        <span>{message}</span>
      </p>
      {children}
    </div>
  );
}
