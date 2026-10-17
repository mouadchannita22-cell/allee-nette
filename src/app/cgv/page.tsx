import { site } from "@/config/site";
import { MISES_A_JOUR } from "@/data/legal";
import { metadonnees } from "@/lib/seo";
import { SommaireCgv } from "@/components/legal/Cgv";
import { PageLegale } from "@/components/legal/PageLegale";
import Cgv from "@/content/cgv.mdx";

export const metadata = metadonnees({
  titre: "Conditions générales de vente",
  description: `Prix fermes confirmés sur photos, conditions d'intervention, paiement sans acompte, droit de rétractation et garantie Retouche : les règles de nos prestations ${site.nom}.`,
  chemin: "/cgv",
});

export default function PageCgv() {
  return (
    <PageLegale
      surtitre="Informations légales"
      titre="Conditions générales de vente"
      intro="Les règles de nos prestations, de la demande de rendez-vous au paiement : à lire avant de réserver."
      miseAJour={MISES_A_JOUR.cgv}
      sommaire={<SommaireCgv />}
    >
      <Cgv />
    </PageLegale>
  );
}
