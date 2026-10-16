"use client";

import type { ReactNode } from "react";
import {
  FORMULES,
  GABARITS,
  OPTIONS,
  abonnementPour,
  duree,
  formule as trouverFormule,
  type FormuleId,
  type Gabarit,
  type OptionId,
  type OptionTarif,
} from "@/data/offres";
import { disponibilite, prixFormule, type SelectionOptions } from "@/lib/prix";
import { euros } from "@/lib/texte";

/**
 * Blocs de choix d'une voiture (formule, gabarit, abonnement, options),
 * partagés par le calculateur (/tarifs, accueil) et le formulaire de
 * réservation. Les couleurs suivent le thème de la section (claire ou sombre).
 */

/** Carte cliquable autour d'un bouton radio masqué (formule, gabarit, réponses du formulaire). */
export const classesCarteChoix =
  "cursor-pointer rounded-2xl border border-bord-champ transition-colors hover:border-accent/60 " +
  "has-checked:border-accent has-checked:bg-accent/10 " +
  "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]";

type PropsFormule = {
  /** Préfixe unique des identifiants et du nom du groupe. */
  nom: string;
  formule: FormuleId;
  gabarit: Gabarit;
  onChoisir: (formule: FormuleId) => void;
  className?: string;
};

/** Les quatre formules, avec le prix pour le gabarit choisi. */
export function ChoixFormule({ nom, formule, gabarit, onChoisir, className = "" }: PropsFormule) {
  return (
    <fieldset className={className}>
      <legend className="mb-3 text-sm font-semibold">Formule</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {FORMULES.map((f) => (
          <label
            key={f.id}
            htmlFor={`${nom}-formule-${f.id}`}
            className={`relative flex flex-col p-4 ${classesCarteChoix}`}
          >
            <input
              id={`${nom}-formule-${f.id}`}
              type="radio"
              name={`${nom}-formule`}
              value={f.id}
              checked={formule === f.id}
              onChange={() => onChoisir(f.id)}
              className="sr-only"
            />
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{f.nom}</span>
              <span className="font-titre text-lg font-bold tabular-nums">{euros(f.prix[gabarit])}</span>
            </span>
            <span className="mt-1 text-sm text-doux">
              {f.positionnement} · {duree(f)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type PropsGabarit = {
  nom: string;
  gabarit: Gabarit;
  onChoisir: (gabarit: Gabarit) => void;
  className?: string;
  /** Placé sous les gabarits (aide « Quel est mon gabarit ? »…). */
  children?: ReactNode;
};

/** Gabarit S, M ou L, avec la description du gabarit choisi. */
export function ChoixGabarit({ nom, gabarit, onChoisir, className = "", children }: PropsGabarit) {
  const info = GABARITS.find((g) => g.code === gabarit);
  return (
    <fieldset className={className}>
      <legend className="mb-3 text-sm font-semibold">Gabarit</legend>
      <div className="grid grid-cols-3 gap-2">
        {GABARITS.map((g) => (
          <label
            key={g.code}
            htmlFor={`${nom}-gabarit-${g.code}`}
            title={g.libelle}
            className={`flex flex-col items-center px-2 py-3 text-center ${classesCarteChoix}`}
          >
            <input
              id={`${nom}-gabarit-${g.code}`}
              type="radio"
              name={`${nom}-gabarit`}
              value={g.code}
              checked={gabarit === g.code}
              onChange={() => onChoisir(g.code)}
              className="sr-only"
            />
            <span className="font-titre text-xl font-bold">{g.code}</span>
            <span className="mt-0.5 text-xs text-doux">{g.libelleCourt}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-doux">
        {info?.libelle}
        {info?.exemples ? ` : ${info.exemples}` : ""}
      </p>
      {children}
    </fieldset>
  );
}

type PropsAbonnement = {
  id: string;
  formule: FormuleId;
  gabarit: Gabarit;
  coche: boolean;
  onChange: (coche: boolean) => void;
  className?: string;
};

/** Case « Abonnement » : affichée seulement si la formule en propose un. */
export function CaseAbonnement({ id, formule, gabarit, coche, onChange, className = "" }: PropsAbonnement) {
  const abonnement = abonnementPour(formule);
  if (!abonnement) return null;
  const f = trouverFormule(formule);
  return (
    <label htmlFor={id} className={`flex items-start gap-3 p-4 ${classesCarteChoix} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <span className="text-sm">
        <span className="font-semibold">
          Abonnement {abonnement.frequence} : {euros(prixFormule(f.id, gabarit, true))} au lieu de{" "}
          {euros(f.prix[gabarit])}
        </span>
        <span className="block text-doux">Sans engagement, créneau fixe, priorité de réservation.</span>
      </span>
    </label>
  );
}

/** Prix affiché d'une option : « +25 € », « +15 € / siège », « +25 à +45 € ». */
export function prixOption(o: OptionTarif): string {
  if (typeof o.prix !== "number") return `+${o.prix.min} à +${o.prix.max} €`;
  if (o.unite) return `+${o.prix} € / ${o.unite.singulier}`;
  return o.id === "exterieur-seul" ? `${o.prix} €` : `+${o.prix} €`;
}

type PropsOptions = {
  nom: string;
  formule: FormuleId;
  options: SelectionOptions;
  /** Coche (quantité > 0), décoche (0) ou change la quantité d'une option. */
  onBasculer: (option: OptionId, quantite: number) => void;
  /** Identifiant du groupe (cible des liens d'erreur). */
  id?: string;
  className?: string;
};

/** Liste des options : indisponibles grisées avec leur raison, quantités pour les options à l'unité. */
export function ListeOptions({ nom, formule, options, onBasculer, id, className = "" }: PropsOptions) {
  return (
    <fieldset id={id} tabIndex={id ? -1 : undefined} className={className}>
      <legend className="mb-3 text-sm font-semibold">Options</legend>
      <ul className="divide-y divide-bord rounded-2xl border border-bord-champ">
        {OPTIONS.map((o) => (
          <LigneOption
            key={o.id}
            option={o}
            formule={formule}
            quantite={options[o.id] ?? 0}
            nom={nom}
            onChanger={(q) => onBasculer(o.id, q)}
          />
        ))}
      </ul>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Une option
// ---------------------------------------------------------------------------

function LigneOption({
  option: o,
  formule,
  quantite,
  nom,
  onChanger,
}: {
  option: OptionTarif;
  formule: FormuleId;
  quantite: number;
  nom: string;
  onChanger: (quantite: number) => void;
}) {
  const dispo = disponibilite(formule, o.id);
  const idCase = `${nom}-${o.id}`;
  const idRaison = `${idCase}-raison`;

  return (
    <li className="flex flex-wrap items-center gap-x-3 px-4 py-1">
      <label
        htmlFor={idCase}
        className={`flex min-h-11 min-w-[min(100%,11rem)] flex-1 items-center gap-3 py-1.5 text-sm ${dispo.disponible ? "cursor-pointer" : "cursor-not-allowed text-doux"}`}
      >
        <input
          id={idCase}
          type="checkbox"
          checked={dispo.disponible && quantite > 0}
          disabled={!dispo.disponible}
          aria-describedby={dispo.disponible ? undefined : idRaison}
          onChange={(e) => onChanger(e.target.checked ? (o.unite?.min ?? 1) : 0)}
          className="size-5 shrink-0 accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="min-w-0">
          <span className={dispo.disponible ? "" : "line-through decoration-doux/60"}>{o.libelle}</span>
          {o.aConfirmerSurPhotos && <span className="block text-xs text-doux">Montant confirmé sur vos photos</span>}
          {!dispo.disponible && (
            <span id={idRaison} className="block text-xs text-doux">
              {dispo.raison}
            </span>
          )}
        </span>
      </label>
      {o.unite && dispo.disponible && quantite > 0 && (
        <select
          aria-label={`Nombre de ${o.unite.pluriel}`}
          value={quantite}
          onChange={(e) => onChanger(Number(e.target.value))}
          className="h-11 rounded-lg border border-bord-champ bg-fond px-2 text-sm text-texte"
        >
          {Array.from({ length: o.unite.max - o.unite.min + 1 }, (_, k) => o.unite!.min + k).map((n) => (
            <option key={n} value={n}>
              {n} {n > 1 ? o.unite!.pluriel : o.unite!.singulier}
            </option>
          ))}
        </select>
      )}
      <span className={`shrink-0 text-sm font-semibold tabular-nums text-doux ${dispo.disponible ? "" : "line-through"}`}>
        {prixOption(o)}
      </span>
    </li>
  );
}
