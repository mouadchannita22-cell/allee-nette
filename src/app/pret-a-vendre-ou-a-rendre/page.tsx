import { notFound } from "next/navigation";
import { site, zoneActive } from "@/config/site";
import { formule } from "@/data/offres";
import { metadonnees } from "@/lib/seo";
import { Bouton } from "@/components/ui/Bouton";
import { EnTetePage } from "@/components/sections/EnTetes";
import { FicheFormule } from "@/components/sections/FicheFormule";
import { AppelFinal } from "@/components/sections/Divers";

const f = formule("pret-a-vendre");

export const metadata = metadonnees({
  titre: `Préparer sa voiture pour la vente ou une restitution à ${zoneActive.ville}`,
  description: `${f.nom} : nettoyage intérieur en profondeur à domicile et 6 photos d'annonce prises sur place, dès ${f.prix.S} €. ${zoneActive.ville} et alentours.`,
  chemin: "/pret-a-vendre-ou-a-rendre",
  indexer: site.pages.pretAVendre,
});

export default function PagePretAVendre() {
  // Page prévue pour le mois 2 : activez-la dans config/site.ts (pages.pretAVendre).
  if (!site.pages.pretAVendre) notFound();

  return (
    <>
      <EnTetePage
        surtitre="Vente ou restitution de location"
        titre="Une voiture qui fait bonne impression."
        intro="Avant une vente, des photos d'annonce qui donnent envie. Avant de rendre une location, une voiture propre avec des photos datées."
      >
        <Bouton href={`/reserver?f=${f.id}&g=M`} taille="lg">
          Réserver {f.nom}
        </Bouton>
      </EnTetePage>
      <FicheFormule id="pret-a-vendre" />
      <AppelFinal />
    </>
  );
}
