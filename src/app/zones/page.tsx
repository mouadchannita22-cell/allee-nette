import { communesDesservies, zoneActive } from "@/config/site";
import { CONDITIONS, EMPLACEMENTS } from "@/data/conditions";
import { DEPLACEMENT, formule } from "@/data/offres";
import { questions } from "@/content/faq";
import { metadonnees } from "@/lib/seo";
import { ZonesInteractives } from "@/components/fx/ZonesInteractives";
import { EnTetePage, EnTeteSection } from "@/components/sections/EnTetes";
import { ListeFaq } from "@/components/sections/ListeFaq";
import { MentionPrix } from "@/components/sections/MentionPrix";
import { AppelFinal } from "@/components/sections/Divers";

const [c1, c2, c3] = zoneActive.communesPrincipales;
const nombre = communesDesservies().length;

export const metadata = metadonnees({
  titre: `Zones d'intervention : ${zoneActive.ville} et ${zoneActive.rayons.zone2} km alentour`,
  description: `Nettoyage auto à domicile dans ${nombre} communes autour de ${zoneActive.ville} : ${c1}, ${c2}, ${c3}… Déplacement inclus jusqu'à ${zoneActive.rayons.zone1} km, +${DEPLACEMENT.zone2.supplement} € jusqu'à ${zoneActive.rayons.zone2} km.`,
  chemin: "/zones",
});

function ListeCommunes({ communes }: { communes: readonly { nom: string; cp: string; insee: string }[] }) {
  return (
    <ul className="mt-5 columns-2 gap-x-6 text-sm sm:columns-3 lg:columns-4">
      {communes.map((c) => (
        <li key={c.insee} className="break-inside-avoid py-1">
          {c.nom} <span className="text-doux">{c.cp}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PageZones() {
  const minimales = DEPLACEMENT.zone2.formulesMinimales.map((id) => formule(id).nomCourt).join(", ");

  return (
    <>
      <EnTetePage
        surtitre="Zones d'intervention"
        titre={`${zoneActive.ville} et ${zoneActive.rayons.zone2} km alentour.`}
        intro={`Nous venons chez vous dans ${nombre} communes autour de ${zoneActive.ville}. Pas de station, pas d'atelier : nous intervenons uniquement à votre domicile.`}
      />

      <section aria-labelledby="titre-verifier" className="theme-sombre relative z-10 pb-24">
        <div className="conteneur">
          <ZonesInteractives />
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { titre: "Zone 1", sous: `Jusqu'à ${zoneActive.rayons.zone1} km`, prix: "Déplacement inclus", regle: `Commande minimale ${DEPLACEMENT.zone1.commandeMinimale} €` },
              { titre: "Zone 2", sous: `De ${zoneActive.rayons.zone1} à ${zoneActive.rayons.zone2} km`, prix: `+${DEPLACEMENT.zone2.supplement} €`, regle: `${minimales} au minimum` },
              { titre: "Hors zone", sous: `Au-delà de ${zoneActive.rayons.zone2} km`, prix: "Sur demande", regle: `${DEPLACEMENT.horsZone.vehiculesMinimum} véhicules minimum` },
            ].map((z) => (
              <div key={z.titre} className="rounded-carte border border-bord bg-texte/[0.03] p-5">
                <p className="font-titre text-lg font-bold">{z.titre}</p>
                <p className="text-sm text-doux">{z.sous}</p>
                <p className="mt-4 text-lg font-semibold text-accent">{z.prix}</p>
                <p className="mt-1 text-sm text-doux">{z.regle}</p>
              </div>
            ))}
            <MentionPrix className="sm:col-span-3" />
          </div>
        </div>
      </section>

      <section aria-labelledby="titre-communes" className="theme-clair py-24 md:py-32">
        <div className="conteneur">
          <EnTeteSection
            id="titre-communes"
            surtitre="Communes desservies"
            titre="Votre commune est-elle dans la liste ?"
            intro={`Distances mesurées depuis ${zoneActive.ville}. Votre commune n'y est pas ? Écrivez-nous : à partir de ${DEPLACEMENT.horsZone.vehiculesMinimum} véhicules, nous étudions une tournée.`}
          />
          <h3 className="mt-12 font-sans text-xl font-bold tracking-normal">
            Zone 1 : déplacement inclus ({zoneActive.zone1.length} communes)
          </h3>
          <ListeCommunes communes={zoneActive.zone1} />
          <h3 className="mt-12 font-sans text-xl font-bold tracking-normal">
            Zone 2 : +{DEPLACEMENT.zone2.supplement} € ({zoneActive.zone2.length} communes)
          </h3>
          <ListeCommunes communes={zoneActive.zone2} />
        </div>
      </section>

      <section aria-labelledby="titre-conditions" className="theme-sombre py-24 md:py-32">
        <div className="conteneur grid gap-10 lg:grid-cols-2">
          <EnTeteSection
            id="titre-conditions"
            surtitre="Conditions d'intervention"
            titre="Où nous intervenons."
            intro="Uniquement sur un emplacement privé : jamais sur la voie publique."
          />
          <ul className="space-y-3 self-center">
            {EMPLACEMENTS.map((e) => (
              <li key={e} className="flex gap-3 rounded-2xl border border-bord bg-texte/[0.03] px-5 py-4">
                <span aria-hidden="true" className="text-accent">
                  ✓
                </span>
                {e}
              </li>
            ))}
            <li className="flex gap-3 rounded-2xl border border-bord bg-texte/[0.03] px-5 py-4">
              <span aria-hidden="true" className="text-accent">
                ✓
              </span>
              Une prise électrique à moins de {CONDITIONS.priseElectriqueMetres} mètres
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="titre-faq-zones" className="theme-clair py-24 md:py-32">
        <div className="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <EnTeteSection id="titre-faq-zones" surtitre="Questions fréquentes" titre="Zones et déplacement" />
          <ListeFaq questions={questions(["zones", "copropriete", "electricite", "presence"])} />
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
