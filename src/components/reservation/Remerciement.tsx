"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { MESSAGE_DEMANDE_RECUE, PHOTOS_DEMANDEES, RAPPELS_RENDEZ_VOUS } from "@/data/reservation";
import { lienWhatsApp, lienWhatsAppPhotos } from "@/lib/contact";
import { FORMAT_REFERENCE } from "@/lib/reservation/api";
import { MENTION_ESTIMATION } from "@/lib/prix";
import { devisReservation } from "@/lib/reservation/devis";
import { ACompleter } from "@/components/ui/ACompleter";
import { Bouton } from "@/components/ui/Bouton";
import { IconeMessage } from "@/components/ui/Icones";
import { demandeEnvoyee, type DemandeEnvoyee } from "./derniere-demande";
import { Recapitulatif } from "./Recapitulatif";

/**
 * Lit la référence dans l'URL (?ref=AN-…) et retrouve le récapitulatif de la
 * demande envoyée pendant la visite. Après un rechargement, seuls la
 * référence et le texte générique restent.
 */
export function RemerciementDepuisUrl({ idTitre }: { idTitre: string }) {
  const brute = useSearchParams().get("ref") ?? "";
  const reference = FORMAT_REFERENCE.test(brute) ? brute : null;
  const [demande] = useState(() => (reference ? demandeEnvoyee(reference) : null));

  // Arrivée depuis le formulaire : le focus passe au titre de la page, comme après un chargement.
  useEffect(() => {
    if (demande) document.getElementById(idTitre)?.focus();
  }, [demande, idTitre]);

  return <ContenuRemerciement reference={reference} demande={demande} />;
}

type Props = { reference: string | null; demande: DemandeEnvoyee | null };

/** Référence, délai de réponse, photos par WhatsApp, rappels avant le rendez-vous, récapitulatif. */
export function ContenuRemerciement({ reference, demande }: Props) {
  const whatsapp = reference
    ? lienWhatsAppPhotos(reference)
    : lienWhatsApp(`Bonjour ${site.nom}, voici les photos de ma voiture pour ma demande de réservation.`);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-6">
        <div className="rounded-carte border border-bord-champ bg-blanc p-6 shadow-douce">
          {reference && (
            <p className="text-sm text-doux">
              Votre référence
              <span className="mt-1 block whitespace-nowrap font-titre text-2xl font-extrabold tracking-normal text-texte sm:text-3xl">
                {reference}
              </span>
            </p>
          )}
          <p className={`text-lg font-semibold ${reference ? "mt-4" : ""}`}>{MESSAGE_DEMANDE_RECUE}</p>
          <p className="mt-2 text-doux">
            Nous regardons votre demande et vos photos, puis nous revenons vers vous avec le prix ferme, avant tout
            rendez-vous. {reference ? "Rappelez votre référence dans vos messages." : ""}
          </p>
          {demande?.demo && (
            <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-sm">
              Mode démonstration : la demande a été vérifiée, mais aucun e-mail n&apos;est parti.
            </p>
          )}
        </div>

        <div className="rounded-carte border border-bord-champ bg-blanc p-6">
          <h2 className="font-sans text-lg font-bold tracking-normal">
            {demande && demande.photos.length > 0 ? "Une photo à ajouter ?" : "Vos photos"}
          </h2>
          <p className="mt-2 text-doux">
            {demande && demande.photos.length > 0
              ? "Vos photos sont bien parties avec la demande. Pour en ajouter une, envoyez-la sur WhatsApp."
              : `Envoyez-nous trois photos (${PHOTOS_DEMANDEES.map((p) => p.libelle.toLowerCase()).join(", ")}) : nous confirmons le prix ferme à partir d'elles.`}
          </p>
          {whatsapp ? (
            <Bouton
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full sm:w-auto"
            >
              <IconeMessage className="size-5" />
              Envoyer mes photos sur WhatsApp
              <span className="sr-only"> (nouvel onglet)</span>
            </Bouton>
          ) : (
            <p className="mt-5 text-sm">
              WhatsApp : <ACompleter libelle="numéro WhatsApp" />
            </p>
          )}
        </div>

        <div className="rounded-carte border border-bord-champ bg-blanc p-6">
          <h2 className="font-sans text-lg font-bold tracking-normal">Le jour du rendez-vous</h2>
          <ul className="mt-3 space-y-2">
            {RAPPELS_RENDEZ_VOUS.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-accent">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <Bouton href="/" variante="secondaire">
          Retour à l&apos;accueil
        </Bouton>
      </div>

      {demande && (
        <section aria-labelledby="titre-recap-merci">
          <h2 id="titre-recap-merci" className="mb-4 font-sans text-lg font-bold tracking-normal">
            Votre demande
          </h2>
          <Recapitulatif
            donnees={demande.donnees}
            zone={demande.zone}
            resultat={devisReservation(
              { voitures: demande.donnees.voitures, commune: demande.donnees.lieu.commune, code: demande.donnees.coordonnees.code },
              demande.zone,
            )}
            photos={demande.photos}
          />
          <p className="mt-3 text-xs leading-relaxed text-doux">
            {MENTION_ESTIMATION} {site.mentionTva}.
          </p>
        </section>
      )}
    </div>
  );
}
