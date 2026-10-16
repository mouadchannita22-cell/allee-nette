import { Suspense } from "react";
import { metadonnees } from "@/lib/seo";
import { Surtitre } from "@/components/sections/EnTetes";
import { ContenuRemerciement, RemerciementDepuisUrl } from "@/components/reservation/Remerciement";

// Page de fin de parcours : jamais indexée, absente du plan du site.
export const metadata = metadonnees({
  titre: "Demande reçue",
  description: "Votre demande de réservation est bien arrivée. Nous vous confirmons le prix ferme sur vos photos.",
  chemin: "/reserver/merci",
  indexer: false,
});

/** Titre de la page : il reçoit le focus à l'arrivée depuis le formulaire. */
const ID_TITRE = "titre-merci";

export default function PageMerci() {
  return (
    <div data-sans-barre-mobile="">
      <section className="theme-sombre relative isolate overflow-hidden pb-10 pt-28 md:pb-14 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
        />
        <div className="conteneur">
          <Surtitre>Réservation</Surtitre>
          <h1 id={ID_TITRE} tabIndex={-1} className="mt-3 text-3xl font-extrabold leading-[1.05] md:text-5xl">
            Demande reçue
          </h1>
        </div>
      </section>

      <section aria-label="Suite de votre demande" className="theme-clair py-10 md:py-16">
        <div className="conteneur">
          <Suspense fallback={<ContenuRemerciement reference={null} demande={null} />}>
            <RemerciementDepuisUrl idTitre={ID_TITRE} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
