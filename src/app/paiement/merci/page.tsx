import { Suspense } from "react";
import type { Metadata } from "next";
import { metadonnees } from "@/lib/seo";
import { ContenuMerci, EnTeteMerci } from "@/components/paiement/ContenuMerci";

// Retour de Stripe ou de PayPal : jamais indexée, absente du plan du site, sans Referer transmis.
export const metadata: Metadata = {
  ...metadonnees({
    titre: "Paiement",
    description: "Suite de votre paiement Allée Nette : confirmation, rendez-vous et facture.",
    chemin: "/paiement/merci",
    indexer: false,
  }),
  referrer: "no-referrer",
};

export default function PageMerciPaiement({ searchParams }: PageProps<"/paiement/merci">) {
  return (
    <div data-sans-barre-mobile="">
      <Suspense
        fallback={
          <EnTeteMerci titre="Votre paiement">
            <p role="status" className="mt-4 text-doux">
              Vérification de votre paiement…
            </p>
          </EnTeteMerci>
        }
      >
        <ContenuMerci parametres={searchParams} />
      </Suspense>
    </div>
  );
}
