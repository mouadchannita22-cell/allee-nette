import { zoneActive } from "@/config/site";
import { FAQ } from "@/content/faq";
import { donneesFaq } from "@/lib/donnees-structurees";
import { metadonnees } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { EnTetePage } from "@/components/sections/EnTetes";
import { ListeFaq } from "@/components/sections/ListeFaq";
import { AppelFinal } from "@/components/sections/Divers";

export const metadata = metadonnees({
  titre: "Questions fréquentes",
  description: `Eau, électricité, durée, paiement, météo, copropriété, zones autour de ${zoneActive.ville} : toutes les réponses sur notre nettoyage auto à domicile.`,
  chemin: "/faq",
});

export default function PageFaq() {
  return (
    <>
      <JsonLd donnees={donneesFaq()} />
      <EnTetePage
        surtitre="Questions fréquentes"
        titre="Tout ce que vous voulez savoir."
        intro="Vous ne trouvez pas votre réponse ? Écrivez-nous sur WhatsApp ou par e-mail, nous répondons vite."
      />
      <section aria-label="Liste des questions" className="theme-clair py-20 md:py-28">
        <div className="conteneur max-w-4xl">
          <ListeFaq questions={FAQ} />
        </div>
      </section>
      <AppelFinal />
    </>
  );
}
