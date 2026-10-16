import { notFound } from "next/navigation";
import { site, zoneActive } from "@/config/site";
import { PACK_ARTISAN } from "@/data/offres";
import { lienWhatsApp } from "@/lib/contact";
import { metadonnees } from "@/lib/seo";
import { Bouton } from "@/components/ui/Bouton";
import { ACompleter } from "@/components/ui/ACompleter";
import { EnTetePage } from "@/components/sections/EnTetes";
import { MentionPrix } from "@/components/sections/MentionPrix";

export const metadata = metadonnees({
  titre: `Nettoyage d'utilitaires pour artisans à ${zoneActive.ville}`,
  description: `${PACK_ARTISAN.nom} : cabine et extérieur sans rinçage, ${PACK_ARTISAN.prixParVehicule} € par véhicule, −${PACK_ARTISAN.remisePourcent} % dès ${PACK_ARTISAN.vehiculesPourRemise} véhicules. Le samedi matin, chez vous, à ${zoneActive.ville} et alentours.`,
  chemin: "/professionnels",
  indexer: site.pages.professionnels,
});

export default function PageProfessionnels() {
  // Page prévue pour le mois 3 : activez-la dans config/site.ts (pages.professionnels).
  if (!site.pages.professionnels) notFound();
  const whatsapp = lienWhatsApp(`Bonjour, je suis artisan et je souhaite un devis pour le ${PACK_ARTISAN.nom}.`);

  return (
    <>
      <EnTetePage
        surtitre="Professionnels"
        titre={`${PACK_ARTISAN.nom}`}
        intro="Vos utilitaires propres, sans immobiliser votre semaine : on vient chez vous le samedi matin, avec tout le matériel."
      >
        {whatsapp ? (
          <Bouton href={whatsapp} target="_blank" rel="noopener noreferrer" taille="lg">
            Demander un devis
          </Bouton>
        ) : (
          <p>
            Devis : <ACompleter libelle="WhatsApp ou e-mail" />
          </p>
        )}
      </EnTetePage>
      <section className="theme-clair py-24" aria-labelledby="titre-pack">
        <div className="conteneur grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="titre-pack" className="text-3xl font-bold">
              {PACK_ARTISAN.prixParVehicule} € par véhicule
            </h2>
            <p className="mt-2 text-doux">
              −{PACK_ARTISAN.remisePourcent} % dès {PACK_ARTISAN.vehiculesPourRemise} véhicules lors d'un même passage.
            </p>
            <MentionPrix className="mt-2" />
            <ul className="mt-8 space-y-2">
              {PACK_ARTISAN.contenu.map((c) => (
                <li key={c} className="flex gap-2.5">
                  <span aria-hidden="true" className="font-bold text-accent">
                    ✓
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <dl className="space-y-5 rounded-carte border border-bord bg-blanc p-6 shadow-douce">
            <div>
              <dt className="text-sm text-doux">Rythme</dt>
              <dd className="font-semibold">{PACK_ARTISAN.rythme}</dd>
            </div>
            <div>
              <dt className="text-sm text-doux">Facturation</dt>
              <dd className="font-semibold">{PACK_ARTISAN.facturation}</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
