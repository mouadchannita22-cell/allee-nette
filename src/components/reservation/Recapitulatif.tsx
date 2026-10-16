"use client";

import type { ReactNode } from "react";
import { GABARITS, OPTIONS, formule as trouverFormule, type ZoneTarif } from "@/data/offres";
import {
  ANIMAUX,
  ETATS_VEHICULE,
  ETAPES_RESERVATION,
  MODES_PAIEMENT,
  QUESTION_CONNAISSANCE,
  REPONSES_PRISE,
  SOURCES_CONNAISSANCE,
  TYPES_EMPLACEMENT,
  libelleDe,
  type NumeroEtape,
} from "@/data/reservation";
import type { ResultatDevis } from "@/lib/prix";
import { libelleCreneau } from "@/lib/reservation/creneaux";
import type { DonneesFormulaire } from "@/lib/reservation/formulaire";
import { vehiculeDevis, type VoitureFormulaire } from "@/lib/reservation/voiture";
import { formaterTelephone, normaliserTelephone } from "@/lib/telephone";
import { euros } from "@/lib/texte";

type Props = {
  donnees: DonneesFormulaire;
  zone: ZoneTarif;
  resultat: ResultatDevis;
  /** Libellés des photos jointes. */
  photos: readonly string[];
  /** Avec cette fonction, chaque bloc a son lien « Modifier » vers l'étape. */
  onModifier?: (etape: NumeroEtape) => void;
};

const LIBELLES_ZONE: Record<ZoneTarif, string> = { zone1: "zone 1", zone2: "zone 2", "hors-zone": "hors zone" };

function optionsDe(v: VoitureFormulaire): string {
  const selection = vehiculeDevis(v).options ?? {};
  const liste = OPTIONS.flatMap((o) => {
    const q = selection[o.id];
    return q ? [o.unite ? `${o.libelle} × ${q}` : o.libelle] : [];
  });
  return liste.length > 0 ? liste.join(" · ") : "Aucune";
}

function totalDe(resultat: ResultatDevis): string {
  switch (resultat.statut) {
    case "estimation":
      return resultat.aConfirmer
        ? `${euros(resultat.total)}, + ${euros(resultat.aConfirmer.min)} à ${euros(resultat.aConfirmer.max)} à confirmer sur vos photos`
        : euros(resultat.total);
    case "sur-demande":
      return `Sur demande (${resultat.message.toLowerCase()})`;
    case "refuse":
      return `${resultat.message}.`;
    case "invalide":
      return resultat.message;
  }
}

/** Récapitulatif de la demande : avant l'envoi (étape 7, avec « Modifier ») et sur la page de remerciement. */
export function Recapitulatif({ donnees, zone, resultat, photos, onModifier }: Props) {
  const { voitures, lieu, coordonnees } = donnees;
  const plusieurs = voitures.length > 1;
  const telephone = normaliserTelephone(coordonnees.telephone);
  const paiement = MODES_PAIEMENT.find((m) => m.id === donnees.paiement);

  return (
    <div className="divide-y divide-bord rounded-carte border border-bord-champ bg-blanc px-5 sm:px-6">
      <Bloc etape={1} titre={plusieurs ? "Vos voitures" : "Votre voiture"} onModifier={onModifier}>
        {voitures.map((v, i) => (
          <Lignes key={i} sousTitre={plusieurs ? `Voiture ${i + 1}` : undefined}>
            <Ligne libelle="Modèle">{v.modele}</Ligne>
            <Ligne libelle="Gabarit">
              {v.gabarit} · {GABARITS.find((g) => g.code === v.gabarit)?.libelleCourt}
            </Ligne>
            <Ligne libelle="État">{libelleDe(ETATS_VEHICULE, v.etat)}</Ligne>
            <Ligne libelle="Animaux">{libelleDe(ANIMAUX, v.animaux)}</Ligne>
            <Ligne libelle="Sièges enfants">{v.siegesEnfant === 0 ? "Aucun" : v.siegesEnfant}</Ligne>
          </Lignes>
        ))}
      </Bloc>

      <Bloc etape={2} titre={plusieurs ? "Vos formules" : "Votre formule"} onModifier={onModifier}>
        {voitures.map((v, i) => (
          <Lignes key={i} sousTitre={plusieurs ? `Voiture ${i + 1}` : undefined}>
            <Ligne libelle="Formule">
              {trouverFormule(v.formule).nom}
              {v.abonnement ? ", en abonnement" : ""}
            </Ligne>
            <Ligne libelle="Options">{optionsDe(v)}</Ligne>
          </Lignes>
        ))}
      </Bloc>

      <Bloc etape={3} titre="Le lieu" onModifier={onModifier}>
        <Lignes>
          <Ligne libelle="Adresse">{lieu.adresse}</Ligne>
          <Ligne libelle="Commune">
            {lieu.commune} ({LIBELLES_ZONE[zone]})
          </Ligne>
          <Ligne libelle="Emplacement">{libelleDe(TYPES_EMPLACEMENT, lieu.emplacement)}</Ligne>
          <Ligne libelle="Prise électrique">{libelleDe(REPONSES_PRISE, lieu.prise)}</Ligne>
        </Lignes>
      </Bloc>

      <Bloc etape={4} titre="Vos créneaux" onModifier={onModifier}>
        <ol className="list-inside list-decimal space-y-1 text-sm font-semibold">
          {donnees.creneaux.filter(Boolean).map((c) => (
            <li key={c}>{libelleCreneau(c)}</li>
          ))}
        </ol>
      </Bloc>

      <Bloc etape={5} titre="Vos coordonnées" onModifier={onModifier}>
        <Lignes>
          <Ligne libelle="Prénom">{coordonnees.prenom}</Ligne>
          <Ligne libelle="Téléphone">{telephone ? formaterTelephone(telephone) : coordonnees.telephone}</Ligne>
          <Ligne libelle="E-mail">{coordonnees.email}</Ligne>
          <Ligne libelle={QUESTION_CONNAISSANCE}>
            {libelleDe(SOURCES_CONNAISSANCE, coordonnees.connaissance) || "Non précisé"}
          </Ligne>
          <Ligne libelle="Code">{coordonnees.code || "Aucun"}</Ligne>
        </Lignes>
      </Bloc>

      <Bloc etape={6} titre="Photos et paiement" onModifier={onModifier}>
        <Lignes>
          <Ligne libelle="Photos">{photos.length > 0 ? photos.join(" · ") : "Aucune : vous pourrez les envoyer sur WhatsApp"}</Ligne>
          <Ligne libelle="Paiement prévu">{paiement ? `${paiement.libelle} (${paiement.moyens.join(", ")})` : ""}</Ligne>
        </Lignes>
      </Bloc>

      <div className="py-5">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-semibold">Total estimé</span>
          <span className="font-titre text-xl font-extrabold">{totalDe(resultat)}</span>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocs
// ---------------------------------------------------------------------------

function Bloc({
  etape,
  titre,
  onModifier,
  children,
}: {
  etape: NumeroEtape;
  titre: string;
  onModifier?: (etape: NumeroEtape) => void;
  children: ReactNode;
}) {
  return (
    <div className="py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-sans text-base font-bold tracking-normal">{titre}</h3>
        {onModifier && (
          <button
            type="button"
            onClick={() => onModifier(etape)}
            className="min-h-11 px-2 text-sm font-semibold text-accent underline underline-offset-4"
          >
            Modifier<span className="sr-only"> : {ETAPES_RESERVATION[etape - 1]}</span>
          </button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Lignes({ sousTitre, children }: { sousTitre?: string; children: ReactNode }) {
  return (
    <div>
      {sousTitre && <p className="mb-1.5 text-sm font-bold text-accent">{sousTitre}</p>}
      <dl className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        {children}
      </dl>
    </div>
  );
}

function Ligne({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-doux">{libelle}</dt>
      <dd className="font-semibold [overflow-wrap:anywhere]">{children}</dd>
    </>
  );
}
