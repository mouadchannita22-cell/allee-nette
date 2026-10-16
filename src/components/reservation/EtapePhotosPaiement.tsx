"use client";

import { site } from "@/config/site";
import { MODES_PAIEMENT, PHOTOS_DEMANDEES, RAPPEL_PAIEMENT, type ModePaiement, type PhotoId } from "@/data/reservation";
import { suivre } from "@/lib/analytics";
import { lienWhatsApp } from "@/lib/contact";
import { ACompleter } from "@/components/ui/ACompleter";
import { classesBouton } from "@/components/ui/Bouton";
import type { ErreursChamps } from "@/lib/reservation/formulaire";
import { GroupeChoix, PastilleErreur, type Choix } from "./Champs";

/** État d'une photo dans le formulaire (mémoire de la page uniquement). */
export type EtatPhoto =
  | { statut: "vide" }
  | { statut: "compression" }
  | { statut: "prete"; photo: File; apercu: string }
  | { statut: "erreur"; message: string };

export type PhotosFormulaire = Record<PhotoId, EtatPhoto>;

export const PHOTOS_VIDES: PhotosFormulaire = { avant: { statut: "vide" }, arriere: { statut: "vide" }, exterieur: { statut: "vide" } };

type Props = {
  photos: PhotosFormulaire;
  paiement: ModePaiement | "";
  erreurs: ErreursChamps;
  onChoisirPhoto: (id: PhotoId, fichier: File) => void;
  onRetirerPhoto: (id: PhotoId) => void;
  onPaiement: (mode: ModePaiement) => void;
};

const CHOIX_PAIEMENT: Choix[] = MODES_PAIEMENT.map((m) => ({ id: m.id, libelle: m.libelle, detail: m.moyens.join(" · ") }));

const MESSAGE_WHATSAPP = `Bonjour ${site.nom}, voici les photos de ma voiture pour ma demande de réservation.`;

function kilooctets(octets: number): string {
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

/** Étape 6 : jusqu'à trois photos, compressées avant l'envoi, et le moyen de paiement prévu. */
export function EtapePhotosPaiement({ photos, paiement, erreurs, onChoisirPhoto, onRetirerPhoto, onPaiement }: Props) {
  const whatsapp = lienWhatsApp(MESSAGE_WHATSAPP);

  return (
    <div className="space-y-6">
      <section aria-labelledby="titre-photos" className="rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
        <h3 id="titre-photos" className="text-lg font-bold">
          Vos photos <span className="font-sans text-base font-normal text-doux">(facultatives)</span>
        </h3>
        <p className="mt-2 text-doux">
          Ces photos nous servent à confirmer le prix ferme. Elles sont allégées sur votre appareil avant l&apos;envoi,
          sans leurs données de localisation.{" "}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => suivre("clic_whatsapp")}
              className="font-semibold text-accent underline underline-offset-4"
            >
              Ou envoyez-les-nous sur WhatsApp<span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : (
            <span>
              Ou envoyez-les-nous sur WhatsApp : <ACompleter libelle="numéro WhatsApp" />
            </span>
          )}
          .
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {PHOTOS_DEMANDEES.map((p) => (
            <EmplacementPhoto
              key={p.id}
              id={p.id}
              libelle={p.libelle}
              etat={photos[p.id]}
              onChoisir={(fichier) => onChoisirPhoto(p.id, fichier)}
              onRetirer={() => onRetirerPhoto(p.id)}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="titre-paiement" className="rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6">
        <h3 id="titre-paiement" className="text-lg font-bold">
          Paiement prévu
        </h3>
        <p className="mt-3 rounded-2xl bg-accent/10 px-4 py-3 font-semibold">{RAPPEL_PAIEMENT}</p>
        <GroupeChoix
          className="mt-6"
          cle="paiement"
          legende="Comment préférez-vous payer ?"
          choix={CHOIX_PAIEMENT}
          valeur={paiement}
          onChange={(id) => onPaiement(id as ModePaiement)}
          erreur={erreurs.paiement}
          grille="sm:grid-cols-2"
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Une photo
// ---------------------------------------------------------------------------

function EmplacementPhoto({
  id,
  libelle,
  etat,
  onChoisir,
  onRetirer,
}: {
  id: PhotoId;
  libelle: string;
  etat: EtatPhoto;
  onChoisir: (fichier: File) => void;
  onRetirer: () => void;
}) {
  const idChamp = `photo-${id}`;
  const idEtat = `${idChamp}-etat`;
  const minuscule = libelle.toLowerCase();

  return (
    <li className="flex flex-col rounded-2xl border border-bord-champ p-3">
      <p className="font-semibold">{libelle}</p>
      <div className="mt-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-texte/[0.06]">
        {etat.statut === "prete" ? (
          // Aperçu local (adresse blob:) : next/image n'a rien à optimiser ici.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={etat.apercu} alt={`Aperçu de la photo : ${minuscule}`} className="size-full object-cover" />
        ) : (
          <span aria-hidden="true" className="px-3 text-center text-sm text-doux">
            {etat.statut === "compression" ? "Allègement…" : "Aucune photo"}
          </span>
        )}
      </div>

      <div id={idEtat} aria-live="polite" className="mt-2 min-h-5 text-sm">
        {etat.statut === "compression" && <p>Allègement de la photo en cours…</p>}
        {etat.statut === "prete" && <p className="text-doux">Photo prête : {kilooctets(etat.photo.size)}.</p>}
        {etat.statut === "erreur" && (
          <p className="flex gap-2 font-semibold text-avertissement">
            <PastilleErreur />
            <span>{etat.message}</span>
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-3">
        <label
          className={`${classesBouton("secondaire", "md", "flex-1 cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--focus)]")}`}
        >
          {etat.statut === "prete" ? "Changer" : "Choisir une photo"}
          <span className="sr-only"> : {minuscule}</span>
          <input
            id={idChamp}
            type="file"
            accept="image/*"
            aria-describedby={idEtat}
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              // Permet de choisir de nouveau le même fichier.
              e.target.value = "";
              if (fichier) onChoisir(fichier);
            }}
            className="sr-only"
          />
        </label>
        {etat.statut === "prete" && (
          <button type="button" onClick={onRetirer} className={classesBouton("fantome", "md", "underline underline-offset-4")}>
            Retirer<span className="sr-only"> la photo : {minuscule}</span>
          </button>
        )}
      </div>
    </li>
  );
}
