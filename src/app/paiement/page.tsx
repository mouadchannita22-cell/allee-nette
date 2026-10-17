import { Suspense } from "react";
import type { Metadata } from "next";
import { metadonnees } from "@/lib/seo";
import { fr } from "@/lib/typo";
import { Surtitre } from "@/components/sections/EnTetes";
import { ContenuPaiement } from "@/components/paiement/ContenuPaiement";

// Page atteinte par un lien signé : jamais indexée, absente du plan du site, interdite dans robots.txt.
// L'adresse contient la signature : aucun Referer n'est transmis (ici et dans next.config.ts).
export const metadata: Metadata = {
  ...metadonnees({
    titre: "Paiement",
    description: "Réglez votre prestation Allée Nette en ligne, avec le lien sécurisé reçu par message.",
    chemin: "/paiement",
    indexer: false,
  }),
  referrer: "no-referrer",
};

export default function PagePaiement({ searchParams }: PageProps<"/paiement">) {
  return (
    <div data-sans-barre-mobile="">
      <section className="theme-sombre relative isolate overflow-hidden pb-10 pt-28 md:pb-14 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
        />
        <div className="conteneur">
          <Surtitre>Paiement</Surtitre>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] md:text-5xl">Régler votre prestation</h1>
          <p className="mt-4 max-w-2xl text-doux md:text-lg">
            {fr("Le prix est confirmé : réglez en ligne en quelques secondes, ou sur place après la prestation.")}
          </p>
        </div>
      </section>

      <section aria-label="Paiement de votre prestation" className="theme-clair py-10 md:py-16">
        <div className="conteneur">
          <Suspense
            fallback={
              <p role="status" className="text-doux">
                Vérification du lien de paiement…
              </p>
            }
          >
            <ContenuPaiement parametres={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
