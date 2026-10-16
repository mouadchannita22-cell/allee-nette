"use client";

import { useId, useState } from "react";
import { DEPLACEMENT } from "@/data/offres";
import { zoneActive } from "@/config/site";
import { rechercherCommunes, trouverCommune, type CommuneZonee } from "@/lib/zones";

/** État de la commune : choisie dans la liste, inconnue (hors zone), ou pas encore indiquée. */
export type EtatCommune = { saisie: string; commune: CommuneZonee | null; inconnue: boolean };

type Props = {
  valeur: EtatCommune;
  onChange: (etat: EtatCommune) => void;
  /** Libellé visible du champ. */
  libelle?: string;
  /** Identifiant du champ (cible des liens d'un résumé d'erreurs). */
  id?: string;
  /** Champ obligatoire d'un formulaire. */
  requis?: boolean;
  /** Message d'erreur affiché sous le champ et relié à lui. */
  erreur?: string;
};

/** Champ « Votre commune » avec autocomplétion (motif ARIA combobox). */
export function ChampCommune({ valeur, onChange, libelle = "Votre commune", id: idChamp, requis = false, erreur }: Props) {
  const idAuto = useId();
  const id = idChamp ?? idAuto;
  const idErreur = `${id}-erreur`;
  const idListe = `${id}-liste`;
  const idAide = `${id}-aide`;
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const suggestions = valeur.commune ? [] : rechercherCommunes(valeur.saisie, 6);
  const listeVisible = ouvert && suggestions.length > 0;

  const choisir = (c: CommuneZonee) => {
    onChange({ saisie: c.nom, commune: c, inconnue: false });
    setOuvert(false);
    setActif(-1);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {libelle}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="address-level2"
        aria-autocomplete="list"
        aria-expanded={listeVisible}
        aria-controls={idListe}
        aria-activedescendant={listeVisible && actif >= 0 ? `${idListe}-${actif}` : undefined}
        aria-describedby={erreur ? `${idErreur} ${idAide}` : idAide}
        aria-invalid={erreur ? true : undefined}
        aria-required={requis || undefined}
        maxLength={80}
        placeholder={`Par exemple : ${zoneActive.communesPrincipales[1]}`}
        value={valeur.saisie}
        onChange={(e) => {
          const saisie = e.target.value;
          onChange({ saisie, commune: trouverCommune(saisie), inconnue: false });
          setOuvert(true);
          setActif(-1);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => {
          setOuvert(false);
          if (valeur.saisie.trim() && !valeur.commune) onChange({ ...valeur, inconnue: true });
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && suggestions.length) {
            e.preventDefault();
            setOuvert(true);
            setActif((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && suggestions.length) {
            e.preventDefault();
            setActif((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Enter" && listeVisible && actif >= 0) {
            e.preventDefault();
            choisir(suggestions[actif]!);
          } else if (e.key === "Escape") {
            setOuvert(false);
          }
        }}
        className="h-12 w-full rounded-xl border border-bord-champ bg-texte/[0.04] px-4 text-base text-texte placeholder:text-doux/70 aria-invalid:border-2 aria-invalid:border-avertissement"
      />
      {erreur && (
        <p id={idErreur} className="mt-2 text-sm font-semibold text-avertissement">
          {erreur}
        </p>
      )}
      <ul
        id={idListe}
        role="listbox"
        aria-label="Communes desservies"
        hidden={!listeVisible}
        className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-auto rounded-2xl border border-bord bg-fond p-1.5 shadow-2xl"
      >
        {suggestions.map((c, i) => (
          <li
            key={c.insee}
            id={`${idListe}-${i}`}
            role="option"
            aria-selected={i === actif}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choisir(c)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-texte aria-selected:bg-texte/10 hover:bg-texte/8"
          >
            <span>
              {c.nom} <span className="text-texte/75">{c.cp}</span>
            </span>
            <BadgeZone zone={c.zone} />
          </li>
        ))}
      </ul>
      <p id={idAide} className="mt-2 text-sm text-doux" aria-live="polite">
        {messageZone(valeur)}
      </p>
    </div>
  );
}

function messageZone({ saisie, commune, inconnue }: EtatCommune): string {
  if (commune?.zone === "zone1") return `${commune.nom} : zone 1, déplacement inclus.`;
  if (commune?.zone === "zone2") return `${commune.nom} : zone 2, déplacement +${DEPLACEMENT.zone2.supplement} €.`;
  if (inconnue && saisie.trim()) return `${saisie.trim()} : hors zone, sur demande.`;
  return `Déplacement inclus jusqu'à ${zoneActive.rayons.zone1} km de ${zoneActive.ville}, +${DEPLACEMENT.zone2.supplement} € jusqu'à ${zoneActive.rayons.zone2} km.`;
}

/** Pastille « Zone 1 », « Zone 2 » ou « Hors zone ». Sur fond clair, couleurs foncées pour rester lisibles. */
export function BadgeZone({ zone }: { zone: "zone1" | "zone2" | "hors-zone" }) {
  const styles = {
    zone1: "bg-aqua text-nuit",
    zone2: "bg-aqua/25 text-aqua in-[.theme-clair]:bg-transparent in-[.theme-clair]:text-texte in-[.theme-clair]:ring-1 in-[.theme-clair]:ring-lagon",
    "hors-zone": "bg-alerte/20 text-alerte in-[.theme-clair]:text-ambre",
  } as const;
  const libelles = { zone1: "Zone 1", zone2: "Zone 2", "hors-zone": "Hors zone" } as const;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[zone]}`}>{libelles[zone]}</span>
  );
}
