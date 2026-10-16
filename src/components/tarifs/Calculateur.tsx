"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { site } from "@/config/site";
import {
  FORMULES,
  GABARITS,
  OFFRES,
  OPTIONS,
  abonnementPour,
  duree,
  formule as trouverFormule,
  type FormuleId,
  type Gabarit,
  type OptionTarif,
} from "@/data/offres";
import { suivre } from "@/lib/analytics";
import { lienWhatsApp } from "@/lib/contact";
import { versParametres, type EtatCalculateur } from "@/lib/devis-url";
import {
  MENTION_ESTIMATION,
  basculerOption,
  calculerDevis,
  disponibilite,
  nettoyerOptions,
  prixFormule,
  type LigneDevis,
  type ResultatDevis,
  type Vehicule,
} from "@/lib/prix";
import { euros } from "@/lib/texte";
import { trouverCommune } from "@/lib/zones";
import { Bouton } from "@/components/ui/Bouton";
import { ACompleter } from "@/components/ui/ACompleter";
import { AideGabarit } from "./AideGabarit";
import { ChampCommune, type EtatCommune } from "./ChampCommune";
import { ChiffreRoulant } from "@/components/fx/ChiffreRoulant";

type Props = {
  /** État de départ (formule mise en avant, ou estimation reçue par l'URL). */
  initial?: Partial<EtatCalculateur>;
  /** Version courte, pour l'accueil : une seule voiture, sans code. */
  compact?: boolean;
};

const MAX_VEHICULES = 2;

export function Calculateur({ initial, compact = false }: Props) {
  const [vehicules, setVehicules] = useState<Vehicule[]>(
    initial?.vehicules?.length ? initial.vehicules : [{ formule: "complet", gabarit: "M", options: {} }],
  );
  const [commune, setCommune] = useState<EtatCommune>(() => {
    const saisie = initial?.commune ?? "";
    const c = saisie ? trouverCommune(saisie) : null;
    return { saisie, commune: c, inconnue: Boolean(saisie && !c) };
  });
  const [code, setCode] = useState(initial?.code ?? "");
  const dejaSuivi = useRef(false);
  const idRecap = `${useId()}-recap`;

  const zone = commune.commune?.zone ?? (commune.inconnue ? "hors-zone" : "zone1");
  const resultat = useMemo(() => calculerDevis({ vehicules, zone, code }), [vehicules, zone, code]);

  const interagir = () => {
    if (!dejaSuivi.current) {
      dejaSuivi.current = true;
      suivre("calculateur_utilise");
    }
  };

  const modifierVehicule = (i: number, maj: (v: Vehicule) => Vehicule) => {
    interagir();
    setVehicules((liste) => liste.map((v, j) => (j === i ? maj(v) : v)));
  };

  const lienReservation = `/reserver?${versParametres({
    vehicules,
    commune: commune.commune?.nom ?? commune.saisie,
    code,
  }).toString()}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()} aria-label="Calculateur de prix">
        {vehicules.map((v, i) => (
          <BlocVehicule
            key={i}
            compact={compact}
            index={i}
            total={vehicules.length}
            vehicule={v}
            onChange={(maj) => modifierVehicule(i, maj)}
            onRetirer={() => setVehicules((liste) => liste.filter((_, j) => j !== i))}
          />
        ))}

        {!compact && vehicules.length < MAX_VEHICULES && OFFRES.deuxVoitures.actif && (
          <button
            type="button"
            onClick={() => {
              interagir();
              setVehicules((liste) => [...liste, { formule: "interieur-net", gabarit: "S", options: {} }]);
            }}
            className="w-full rounded-carte border border-dashed border-bord px-5 py-4 text-left text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-texte/[0.03]"
          >
            + Ajouter une deuxième voiture à la même adresse{" "}
            <span className="font-normal text-doux">({OFFRES.deuxVoitures.remiseDeuxieme} € de remise)</span>
          </button>
        )}

        <fieldset className="rounded-carte border border-bord bg-texte/[0.03] p-5 sm:p-6">
          <legend className="sr-only">Lieu et code</legend>
          <div className={compact ? "" : "grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]"}>
            <ChampCommune
              valeur={commune}
              onChange={(etat) => {
                interagir();
                setCommune(etat);
              }}
            />
            {!compact && (
              <div>
                <label htmlFor="code-offre" className="mb-2 block text-sm font-semibold">
                  Code <span className="font-normal text-doux">(facultatif)</span>
                </label>
                <input
                  id="code-offre"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    interagir();
                    setCode(e.target.value.toUpperCase());
                  }}
                  placeholder="GARAGE, VOISIN…"
                  autoCapitalize="characters"
                  className="h-12 w-full rounded-xl border border-bord bg-texte/[0.04] px-4 text-base uppercase text-texte placeholder:normal-case placeholder:text-doux/70"
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* Mobile et tablette : le total reste visible pendant le remplissage. */}
        <a
          href={`#${idRecap}`}
          className="sticky bottom-[calc(var(--hauteur-barre-mobile)+env(safe-area-inset-bottom)+1rem)] z-10 flex items-center justify-between gap-3 rounded-2xl border border-aqua/40 bg-nuit/90 px-5 py-3 shadow-eclat backdrop-blur-md md:bottom-4 lg:hidden"
        >
          <span className="text-sm text-doux">Total estimé</span>
          <span className="font-titre text-2xl font-extrabold tabular-nums">
            {resultat.statut === "estimation" ? <ChiffreRoulant montant={resultat.total} /> : "—"}
          </span>
          <span className="text-sm font-semibold text-accent">Détail ↓</span>
        </a>
      </form>

      <Recapitulatif
        id={idRecap}
        resultat={resultat}
        communeRenseignee={Boolean(commune.commune) || commune.inconnue}
        commune={commune.saisie}
        lienReservation={lienReservation}
        onBasculer={(f) => {
          interagir();
          setVehicules((liste) => liste.map((v, j) => (j === 0 ? { ...v, formule: f, options: nettoyerOptions(f, v.options ?? {}) } : v)));
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Une voiture : formule, gabarit, abonnement, options
// ---------------------------------------------------------------------------

function BlocVehicule({
  compact,
  index,
  total,
  vehicule,
  onChange,
  onRetirer,
}: {
  compact: boolean;
  index: number;
  total: number;
  vehicule: Vehicule;
  onChange: (maj: (v: Vehicule) => Vehicule) => void;
  onRetirer: () => void;
}) {
  const nom = `${useId()}-v${index}`;
  const abonnement = abonnementPour(vehicule.formule);
  const formule = trouverFormule(vehicule.formule);

  return (
    <fieldset className="rounded-carte border border-bord bg-texte/[0.03] p-5 sm:p-6">
      <legend className="sr-only">{total > 1 ? `Voiture ${index + 1}` : "Votre voiture"}</legend>
      {total > 1 && (
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-titre text-lg font-bold">Voiture {index + 1}</h3>
          {index > 0 && (
            <button type="button" onClick={onRetirer} className="text-sm font-semibold text-doux underline-offset-4 hover:text-texte hover:underline">
              Retirer
            </button>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Formule</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {FORMULES.map((f) => (
            <label
              key={f.id}
              htmlFor={`${nom}-formule-${f.id}`}
              className="relative flex cursor-pointer flex-col rounded-2xl border border-bord p-4 transition-colors hover:border-accent/60 has-checked:border-aqua has-checked:bg-aqua/10 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
            >
              <input
                id={`${nom}-formule-${f.id}`}
                type="radio"
                name={`${nom}-formule`}
                value={f.id}
                checked={vehicule.formule === f.id}
                onChange={() => onChange((v) => ({ ...v, formule: f.id, options: nettoyerOptions(f.id, v.options ?? {}) }))}
                className="sr-only"
              />
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{f.nom}</span>
                <span className="font-titre text-lg font-bold tabular-nums">{euros(f.prix[vehicule.gabarit])}</span>
              </span>
              <span className="mt-1 text-sm text-doux">
                {f.positionnement} · {duree(f)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-3 text-sm font-semibold">Gabarit</legend>
        <div className="grid grid-cols-3 gap-2">
          {GABARITS.map((g) => (
            <label
              key={g.code}
              htmlFor={`${nom}-gabarit-${g.code}`}
              title={g.libelle}
              className="flex cursor-pointer flex-col items-center rounded-2xl border border-bord px-2 py-3 text-center transition-colors hover:border-accent/60 has-checked:border-aqua has-checked:bg-aqua/10 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]"
            >
              <input
                id={`${nom}-gabarit-${g.code}`}
                type="radio"
                name={`${nom}-gabarit`}
                value={g.code}
                checked={vehicule.gabarit === g.code}
                onChange={() => onChange((v) => ({ ...v, gabarit: g.code as Gabarit }))}
                className="sr-only"
              />
              <span className="font-titre text-xl font-bold">{g.code}</span>
              <span className="mt-0.5 text-xs text-doux">{g.libelleCourt}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-doux">
          {GABARITS.find((g) => g.code === vehicule.gabarit)?.libelle}
          {GABARITS.find((g) => g.code === vehicule.gabarit)?.exemples
            ? ` : ${GABARITS.find((g) => g.code === vehicule.gabarit)?.exemples}`
            : ""}
        </p>
        <AideGabarit onChoisir={(g) => onChange((v) => ({ ...v, gabarit: g }))} />
      </fieldset>

      {abonnement && !compact && (
        <label
          htmlFor={`${nom}-abonnement`}
          className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-bord p-4 has-checked:border-aqua has-checked:bg-aqua/10"
        >
          <input
            id={`${nom}-abonnement`}
            type="checkbox"
            checked={Boolean(vehicule.abonnement)}
            onChange={(e) => onChange((v) => ({ ...v, abonnement: e.target.checked }))}
            className="mt-0.5 size-5 accent-[var(--color-aqua)]"
          />
          <span className="text-sm">
            <span className="font-semibold">
              Abonnement {abonnement.frequence} : {euros(prixFormule(formule.id, vehicule.gabarit, true))} au lieu de{" "}
              {euros(formule.prix[vehicule.gabarit])}
            </span>
            <span className="block text-doux">Sans engagement, créneau fixe, priorité de réservation.</span>
          </span>
        </label>
      )}

      {!compact && (
        <fieldset className="mt-6">
          <legend className="mb-3 text-sm font-semibold">Options</legend>
          <ul className="divide-y divide-bord rounded-2xl border border-bord">
            {OPTIONS.map((o) => (
              <LigneOption key={o.id} option={o} vehicule={vehicule} nom={nom} onChange={onChange} />
            ))}
          </ul>
        </fieldset>
      )}
    </fieldset>
  );
}

function prixOption(o: OptionTarif): string {
  if (typeof o.prix !== "number") return `+${o.prix.min} à +${o.prix.max} €`;
  if (o.unite) return `+${o.prix} € / ${o.unite.singulier}`;
  return o.id === "exterieur-seul" ? `${o.prix} €` : `+${o.prix} €`;
}

function LigneOption({
  option: o,
  vehicule,
  nom,
  onChange,
}: {
  option: OptionTarif;
  vehicule: Vehicule;
  nom: string;
  onChange: (maj: (v: Vehicule) => Vehicule) => void;
}) {
  const dispo = disponibilite(vehicule.formule, o.id);
  const quantite = vehicule.options?.[o.id] ?? 0;
  const idCase = `${nom}-${o.id}`;
  const idRaison = `${idCase}-raison`;
  const changer = (q: number) => onChange((v) => ({ ...v, options: basculerOption(v.options ?? {}, o.id, q) }));

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <input
        id={idCase}
        type="checkbox"
        checked={dispo.disponible && quantite > 0}
        disabled={!dispo.disponible}
        aria-describedby={dispo.disponible ? undefined : idRaison}
        onChange={(e) => changer(e.target.checked ? (o.unite?.min ?? 1) : 0)}
        className="size-5 shrink-0 accent-[var(--color-aqua)] disabled:cursor-not-allowed disabled:opacity-40"
      />
      <label htmlFor={idCase} className={`min-w-0 flex-1 text-sm ${dispo.disponible ? "cursor-pointer" : "cursor-not-allowed text-doux"}`}>
        <span className={dispo.disponible ? "" : "line-through decoration-doux/60"}>{o.libelle}</span>
        {o.aConfirmerSurPhotos && <span className="block text-xs text-doux">Montant confirmé sur vos photos</span>}
        {!dispo.disponible && (
          <span id={idRaison} className="block text-xs text-doux">
            {dispo.raison}
          </span>
        )}
      </label>
      {o.unite && dispo.disponible && quantite > 0 && (
        <select
          aria-label={`Nombre de ${o.unite.pluriel}`}
          value={quantite}
          onChange={(e) => changer(Number(e.target.value))}
          className="h-9 rounded-lg border border-bord bg-fond px-2 text-sm text-texte"
        >
          {Array.from({ length: o.unite.max - o.unite.min + 1 }, (_, k) => o.unite!.min + k).map((n) => (
            <option key={n} value={n}>
              {n} {n > 1 ? o.unite!.pluriel : o.unite!.singulier}
            </option>
          ))}
        </select>
      )}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${dispo.disponible ? "text-doux" : "text-doux/50"}`}>
        {prixOption(o)}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Récapitulatif
// ---------------------------------------------------------------------------

function montantLigne(l: LigneDevis): string {
  if (l.type === "offert") return "Offert";
  if (l.type === "a-confirmer" && l.fourchette) return `+${l.fourchette.min} à ${l.fourchette.max} €`;
  if (l.type === "deplacement" && l.montant === 0) return "Inclus";
  if (l.montant < 0) return `−${euros(-l.montant)}`;
  return euros(l.montant);
}

function Recapitulatif({
  id,
  resultat,
  communeRenseignee,
  commune,
  lienReservation,
  onBasculer,
}: {
  id: string;
  resultat: ResultatDevis;
  communeRenseignee: boolean;
  commune: string;
  lienReservation: string;
  onBasculer: (f: FormuleId) => void;
}) {
  const annonce = useAnnonce(resultat);
  const whatsapp = lienWhatsApp(
    `Bonjour Allée Nette, j'habite à ${commune.trim() || "[commune]"}, hors de votre zone. Je souhaite un devis pour deux véhicules ou plus.`,
  );

  return (
    <aside
      id={id}
      className="scroll-mt-28 rounded-carte border border-aqua/30 bg-nuit/70 p-6 shadow-eclat lg:sticky lg:top-28"
      aria-labelledby={`${id}-titre`}
    >
      <h3 id={`${id}-titre`} className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">
        Total estimé
      </h3>
      <p className="sr-only" aria-live="polite">
        {annonce}
      </p>

      {resultat.statut === "estimation" && (
        <>
          <p className="mt-3 font-titre text-6xl font-extrabold">
            <ChiffreRoulant montant={resultat.total} />
          </p>
          {resultat.aConfirmer && (
            <p className="mt-2 text-sm text-alerte">
              + {resultat.aConfirmer.min} à {resultat.aConfirmer.max} € à confirmer sur vos photos
            </p>
          )}
          <ul className="mt-6 space-y-2.5 border-t border-bord pt-5 text-sm">
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
          {(resultat.avertissements.length > 0 || resultat.optionsRefusees.length > 0) && (
            <ul className="mt-5 space-y-2 text-sm text-doux">
              {resultat.optionsRefusees.map((r) => (
                <li key={`${r.vehicule}-${r.option}`}>• {r.raison}.</li>
              ))}
              {resultat.avertissements.map((a) => (
                <li key={a.code}>• {a.message}</li>
              ))}
            </ul>
          )}
          <Bouton href={lienReservation} taille="lg" className="mt-6 w-full">
            Réserver avec cette estimation
          </Bouton>
        </>
      )}

      {resultat.statut === "refuse" && (
        <div className="mt-4">
          <p className="text-lg font-semibold">{resultat.message}.</p>
          <div className="mt-5 flex flex-col gap-2">
            {resultat.formulesProposees.map((f) => (
              <Bouton key={f} variante={f === "complet" ? "primaire" : "secondaire"} onClick={() => onBasculer(f)}>
                Choisir {trouverFormule(f).nomCourt}
              </Bouton>
            ))}
          </div>
        </div>
      )}

      {resultat.statut === "sur-demande" && (
        <div className="mt-4">
          <p className="text-lg font-semibold">{resultat.message}.</p>
          <p className="mt-2 text-sm text-doux">Écrivez-nous : nous regardons ensemble si une tournée est possible.</p>
          {whatsapp ? (
            <Bouton href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 w-full" onClick={() => suivre("clic_whatsapp")}>
              Demander sur WhatsApp
            </Bouton>
          ) : (
            <p className="mt-5 text-sm">
              WhatsApp : <ACompleter libelle="numéro WhatsApp" />
            </p>
          )}
        </div>
      )}

      {resultat.statut === "invalide" && <p className="mt-4 font-semibold text-alerte">{resultat.message}</p>}

      <p className="mt-6 border-t border-bord pt-4 text-xs leading-relaxed text-doux">
        {MENTION_ESTIMATION} {site.mentionTva}.
      </p>
    </aside>
  );
}

/** Texte annoncé aux lecteurs d'écran, différé pour ne pas répéter chaque frappe. */
function useAnnonce(resultat: ResultatDevis): string {
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
