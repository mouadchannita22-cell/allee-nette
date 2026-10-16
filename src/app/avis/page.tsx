import { notFound } from "next/navigation";
import { estRenseigne, site } from "@/config/site";
import { metadonnees } from "@/lib/seo";
import { Bouton } from "@/components/ui/Bouton";
import { EnTetePage } from "@/components/sections/EnTetes";

/** Seuil d'avis Google réels à partir duquel la page Avis s'ouvre. */
const SEUIL_AVIS = 5;
const ouverte = site.avisGoogle.nombre >= SEUIL_AVIS && estRenseigne(site.avisGoogle.lien);

export const metadata = metadonnees({
  titre: "Avis clients",
  description: `Les avis de nos clients sur ${site.nom}, sur notre fiche Google.`,
  chemin: "/avis",
  indexer: ouverte,
});

/** Aucun avis n'est affiché ici : la page renvoie vers les avis Google réels. */
export default function PageAvis() {
  if (!ouverte) notFound();
  return (
    <EnTetePage
      surtitre="Avis clients"
      titre="Nos avis sont sur Google."
      intro={`${site.avisGoogle.nombre} clients ont laissé un avis sur notre fiche Google. Nous les laissons parler là-bas, sans tri.`}
    >
      <Bouton href={site.avisGoogle.lien} target="_blank" rel="noopener noreferrer" taille="lg">
        Lire les avis sur Google
      </Bouton>
    </EnTetePage>
  );
}
