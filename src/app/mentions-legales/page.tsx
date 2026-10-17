import { site } from "@/config/site";
import { MISES_A_JOUR } from "@/data/legal";
import { metadonnees } from "@/lib/seo";
import { PageLegale } from "@/components/legal/PageLegale";
import MentionsLegales from "@/content/mentions-legales.mdx";

export const metadata = metadonnees({
  titre: "Mentions légales",
  description: `Qui édite le site ${site.nom} (deux entrepreneurs individuels), qui l'héberge, médiateur de la consommation, assurance et crédits.`,
  chemin: "/mentions-legales",
});

export default function PageMentionsLegales() {
  return (
    <PageLegale
      surtitre="Informations légales"
      titre="Mentions légales"
      intro="Qui édite ce site, qui l'héberge, et à qui vous adresser en cas de litige."
      miseAJour={MISES_A_JOUR.mentionsLegales}
    >
      <MentionsLegales />
    </PageLegale>
  );
}
