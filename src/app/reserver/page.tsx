import { Suspense } from "react";
import { zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { metadonnees } from "@/lib/seo";
import { fr } from "@/lib/typo";
import { Surtitre } from "@/components/sections/EnTetes";
import { ChargementReservation } from "@/components/reservation/ChargementReservation";
import { ReservationDepuisUrl } from "@/components/reservation/ReservationDepuisUrl";

const [c1, c2] = zoneActive.communesPrincipales;
const heures = CONDITIONS.delaiPrixFermeHeures;

export const metadata = metadonnees({
  titre: `Réserver un nettoyage de voiture à domicile à ${zoneActive.ville}`,
  description: `Réservez en 2 minutes votre nettoyage auto à domicile à ${c1}, ${c2} et alentour. Prix ferme confirmé sur vos photos sous ${heures} heures, rien à payer maintenant.`,
  chemin: "/reserver",
});

export default function PageReserver() {
  return (
    // data-sans-barre-mobile : le formulaire a sa propre barre en bas d'écran (globals.css).
    <div data-sans-barre-mobile="">
      <section className="theme-sombre relative isolate overflow-hidden pb-10 pt-28 md:pb-14 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
        />
        <div className="conteneur">
          <Surtitre>Réservation</Surtitre>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] md:text-5xl">{fr("Réservez votre nettoyage.")}</h1>
          <p className="mt-4 max-w-2xl text-doux md:text-lg">
            {fr(
              `Sept étapes courtes. Nous vous confirmons le prix ferme sur vos photos sous ${heures} heures, avant tout rendez-vous. Rien à payer maintenant.`,
            )}
          </p>
        </div>
      </section>

      <section aria-label="Formulaire de réservation" className="theme-clair py-10 md:py-16">
        <div className="conteneur">
          <Suspense fallback={<ChargementReservation />}>
            <ReservationDepuisUrl />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
