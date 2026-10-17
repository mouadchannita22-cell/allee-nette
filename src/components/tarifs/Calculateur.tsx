"use client";

import { useId, useMemo, useState } from "react";
import { site } from "@/config/site";
import { OFFRES, formule as trouverFormule, type FormuleId } from "@/data/offres";
import { suivreUneFois } from "@/lib/analytics";
import { lienWhatsApp } from "@/lib/contact";
import { versParametres, type EtatCalculateur } from "@/lib/devis-url";
import {
  MENTION_ESTIMATION,
  basculerOption,
  calculerDevis,
  nettoyerOptions,
  type ResultatDevis,
  type Vehicule,
} from "@/lib/prix";
import { trouverCommune } from "@/lib/zones";
import { Bouton } from "@/components/ui/Bouton";
import { ACompleter } from "@/components/ui/ACompleter";
import { AideGabarit } from "./AideGabarit";
import { LignesDevis, RemarquesDevis, useAnnonce } from "./AffichageDevis";
import { ChampCommune, type EtatCommune } from "./ChampCommune";
import { CaseAbonnement, ChoixFormule, ChoixGabarit, ListeOptions } from "./ChoixVehicule";
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
  const idRecap = `${useId()}-recap`;

  const zone = commune.commune?.zone ?? (commune.inconnue ? "hors-zone" : "zone1");
  const resultat = useMemo(() => calculerDevis({ vehicules, zone, code }), [vehicules, zone, code]);

  /** Première interaction avec un calculateur pendant la visite : `calculateur_utilise`, une seule fois. */
  const interagir = () => suivreUneFois("calculateur_utilise", { outil: "calculateur" });

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

      <ChoixFormule
        nom={nom}
        formule={vehicule.formule}
        gabarit={vehicule.gabarit}
        onChoisir={(f) => onChange((v) => ({ ...v, formule: f, options: nettoyerOptions(f, v.options ?? {}) }))}
      />

      <ChoixGabarit
        className="mt-6"
        nom={nom}
        gabarit={vehicule.gabarit}
        onChoisir={(g) => onChange((v) => ({ ...v, gabarit: g }))}
      >
        <AideGabarit onChoisir={(g) => onChange((v) => ({ ...v, gabarit: g }))} />
      </ChoixGabarit>

      {!compact && (
        <CaseAbonnement
          className="mt-6"
          id={`${nom}-abonnement`}
          formule={vehicule.formule}
          gabarit={vehicule.gabarit}
          coche={Boolean(vehicule.abonnement)}
          onChange={(coche) => onChange((v) => ({ ...v, abonnement: coche }))}
        />
      )}

      {!compact && (
        <ListeOptions
          className="mt-6"
          nom={nom}
          formule={vehicule.formule}
          options={vehicule.options ?? {}}
          onBasculer={(id, q) => onChange((v) => ({ ...v, options: basculerOption(v.options ?? {}, id, q) }))}
        />
      )}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Récapitulatif
// ---------------------------------------------------------------------------

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
          <LignesDevis resultat={resultat} communeRenseignee={communeRenseignee} className="mt-6 border-t border-bord pt-5" />
          <RemarquesDevis resultat={resultat} className="mt-5" />
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
            <Bouton href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 w-full">
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
