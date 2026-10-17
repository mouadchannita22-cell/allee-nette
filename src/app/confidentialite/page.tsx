import { site } from "@/config/site";
import { MISES_A_JOUR } from "@/data/legal";
import { metadonnees } from "@/lib/seo";
import { PageLegale } from "@/components/legal/PageLegale";
import Confidentialite from "@/content/confidentialite.mdx";

export const metadata = metadonnees({
  titre: "Politique de confidentialité",
  description: `Données reçues avec une demande de rendez-vous ${site.nom}, à qui elles vont, combien de temps nous les gardons et vos droits. Aucun cookie, aucune donnée bancaire chez nous.`,
  chemin: "/confidentialite",
});

export default function PageConfidentialite() {
  return (
    <PageLegale
      surtitre="Informations légales"
      titre="Politique de confidentialité"
      intro="Ce que nous faisons de vos données quand vous visitez le site, demandez un rendez-vous ou payez en ligne."
      miseAJour={MISES_A_JOUR.confidentialite}
    >
      <Confidentialite />
    </PageLegale>
  );
}
