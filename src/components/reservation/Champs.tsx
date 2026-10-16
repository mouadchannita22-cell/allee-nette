import type { HTMLAttributes, ReactNode } from "react";
import { idChamp, idErreur } from "@/lib/reservation/champs";
import { classesCarteChoix } from "@/components/tarifs/ChoixVehicule";

/**
 * Champs du formulaire de réservation : libellé visible, aide, erreur reliée
 * au champ (aria-invalid, aria-describedby), cibles tactiles de 44 px au moins.
 * L'identifiant de chaque champ vient de sa clé d'erreur (`idChamp`).
 */

/** Champ de saisie sur fond clair : bord contrasté, épaissi en cas d'erreur. */
export const classesChamp =
  "h-12 w-full rounded-xl border border-bord-champ bg-blanc px-4 text-base text-texte placeholder:text-doux " +
  "aria-invalid:border-2 aria-invalid:border-avertissement";

/** Message d'erreur sous un champ. */
export function MessageErreur({ cle, message }: { cle: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={idErreur(cle)} className="mt-2 flex gap-2 text-sm font-semibold text-avertissement">
      <PastilleErreur />
      <span>{message}</span>
    </p>
  );
}

/** Pastille « ! » devant une erreur : l'erreur ne se signale pas que par la couleur. */
export function PastilleErreur() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-avertissement text-[0.7rem] font-bold leading-none text-blanc"
    >
      !
    </span>
  );
}

/** « aria-describedby » d'un champ : son erreur, puis son aide. */
function decritPar(cle: string, erreur: string | undefined, idAide: string | undefined): string | undefined {
  return [erreur ? idErreur(cle) : null, idAide].filter(Boolean).join(" ") || undefined;
}

/** Mention « (facultatif) » à côté d'un libellé. */
function Facultatif() {
  return <span className="font-normal text-doux"> (facultatif)</span>;
}

type PropsTexte = {
  cle: string;
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  erreur?: string;
  /** Aide sous le champ, reliée au champ. */
  aide?: ReactNode;
  /** Aide annoncée quand elle change (gabarit reconnu, effet du code…). */
  aideVivante?: boolean;
  facultatif?: boolean;
  maxLength: number;
  type?: "text" | "tel" | "email";
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  placeholder?: string;
  className?: string;
  classeChamp?: string;
};

/** Champ de texte sur une ligne. */
export function ChampTexte({
  cle,
  libelle,
  valeur,
  onChange,
  erreur,
  aide,
  aideVivante = false,
  facultatif = false,
  maxLength,
  type = "text",
  autoComplete,
  inputMode,
  autoCapitalize,
  placeholder,
  className = "",
  classeChamp = "",
}: PropsTexte) {
  const id = idChamp(cle);
  const idAide = aide !== undefined ? `${id}-aide` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {libelle}
        {facultatif && <Facultatif />}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        required={!facultatif}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        spellCheck={type === "text" ? undefined : false}
        placeholder={placeholder}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar(cle, erreur, idAide)}
        className={`${classesChamp} ${classeChamp}`}
      />
      <MessageErreur cle={cle} message={erreur} />
      {aide !== undefined && (
        <p id={idAide} className="mt-2 min-h-5 text-sm text-doux" aria-live={aideVivante ? "polite" : undefined}>
          {aide}
        </p>
      )}
    </div>
  );
}

/** Un choix d'une liste : identifiant, libellé, précision facultative (prix, moyens de paiement…). */
export type Choix = { id: string; libelle: string; detail?: ReactNode };

type PropsChoix = {
  cle: string;
  legende: ReactNode;
  choix: readonly Choix[];
  valeur: string;
  onChange: (id: string) => void;
  erreur?: string;
  /** Classes de la grille des choix (colonnes). */
  grille?: string;
  facultatif?: boolean;
  /** Aide sous la légende. */
  aide?: ReactNode;
  className?: string;
};

/** Groupe de boutons radio présentés en cartes (une seule réponse). */
export function GroupeChoix({
  cle,
  legende,
  choix,
  valeur,
  onChange,
  erreur,
  grille = "sm:grid-cols-3",
  facultatif = false,
  aide,
  className = "",
}: PropsChoix) {
  const id = idChamp(cle);
  const idAide = aide !== undefined ? `${id}-aide` : undefined;
  return (
    <fieldset
      role="radiogroup"
      className={className}
      aria-describedby={decritPar(cle, erreur, idAide)}
      aria-invalid={erreur ? true : undefined}
      aria-required={!facultatif || undefined}
    >
      <legend className="mb-3 font-semibold">
        {legende}
        {facultatif && <Facultatif />}
      </legend>
      {aide !== undefined && (
        <p id={idAide} className="-mt-1 mb-3 text-sm text-doux">
          {aide}
        </p>
      )}
      <div className={`grid gap-2 ${grille}`}>
        {choix.map((c, i) => {
          const idChoix = i === 0 ? id : `${id}-${c.id}`;
          return (
            <label key={c.id} htmlFor={idChoix} className={`flex min-h-12 items-center gap-3 bg-blanc px-4 py-2.5 ${classesCarteChoix}`}>
              <input
                id={idChoix}
                type="radio"
                name={id}
                value={c.id}
                checked={valeur === c.id}
                onChange={() => onChange(c.id)}
                aria-describedby={erreur ? idErreur(cle) : undefined}
                className="size-5 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-medium">{c.libelle}</span>
                {c.detail && <span className="block text-sm text-doux">{c.detail}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <MessageErreur cle={cle} message={erreur} />
    </fieldset>
  );
}

type PropsCase = {
  cle: string;
  coche: boolean;
  onChange: (coche: boolean) => void;
  erreur?: string;
  facultatif?: boolean;
  children: ReactNode;
};

/** Case à cocher avec son texte (accords de la validation). Jamais précochée par le formulaire. */
export function CaseACocher({ cle, coche, onChange, erreur, facultatif = false, children }: PropsCase) {
  const id = idChamp(cle);
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input
          id={id}
          type="checkbox"
          checked={coche}
          onChange={(e) => onChange(e.target.checked)}
          required={!facultatif}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? idErreur(cle) : undefined}
          className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]"
        />
        <span>{children}</span>
      </label>
      <div className="pl-9">
        <MessageErreur cle={cle} message={erreur} />
      </div>
    </div>
  );
}
