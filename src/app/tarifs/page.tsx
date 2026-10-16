import { zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { prixMinimum } from "@/data/offres";
import { metadonnees } from "@/lib/seo";
import { questions } from "@/content/faq";
import { Calculateur } from "@/components/tarifs/Calculateur";
import { GrilleFormules } from "@/components/tarifs/GrilleFormules";
import { TableauxTarifs } from "@/components/tarifs/TableauxTarifs";
import { EnTetePage, EnTeteSection } from "@/components/sections/EnTetes";
import { ListeFaq } from "@/components/sections/ListeFaq";
import { MentionPrix } from "@/components/sections/MentionPrix";
import { AppelFinal } from "@/components/sections/Divers";
import { Bouton } from "@/components/ui/Bouton";
import { silhouettes } from "@/components/fx/voiture/silhouettes";
import { FondLiquide } from "@/components/fx/FondLiquide";

const [c1, c2] = zoneActive.communesPrincipales;

export const metadata = metadonnees({
  titre: "Tarifs et formules",
  description: `Prix fermes par gabarit dès ${prixMinimum()} €, déplacement inclus à ${c1} et ${c2}. Options, abonnements, offres et calculateur de prix.`,
  chemin: "/tarifs",
});

export default async function PageTarifs() {
  return (
    <>
      <EnTetePage
        surtitre="Tarifs et formules"
        titre="Des prix fermes, par gabarit."
        intro={`Chaque formule a un prix par gabarit, annoncé avant. Nous le confirmons sur vos photos sous ${CONDITIONS.delaiPrixFermeHeures} heures, puis il ne bouge plus : aucun supplément n'est imposé sur place.`}
      >
        <Bouton href="#calculateur" taille="lg">
          Calculer mon prix
        </Bouton>
        <Bouton href="#grille-complete" variante="secondaire" taille="lg">
          Voir la grille complète
        </Bouton>
      </EnTetePage>

      <section id="grille" aria-labelledby="titre-grille" className="theme-sombre scroll-mt-24 pb-24">
        <div className="conteneur">
          <h2 id="titre-grille" className="sr-only">
            Les quatre formules
          </h2>
          <GrilleFormules silhouettes={await silhouettes()} />
          <MentionPrix className="mt-6" />
        </div>
      </section>

      <section id="grille-complete" aria-labelledby="titre-grille-complete" className="theme-clair scroll-mt-24 py-24 md:py-32">
        <div className="conteneur">
          <EnTeteSection
            id="titre-grille-complete"
            surtitre="Grille complète"
            titre="Tous les prix, sans exception."
            intro="Formules, options, déplacement, abonnements et offres en cours. Les montants « sur photos » sont fixés avant le rendez-vous, jamais sur place."
          />
          <div className="mt-14">
            <TableauxTarifs />
          </div>
        </div>
      </section>

      {/* z-10 : la liste des communes passe au-dessus de la section suivante. */}
      <section id="calculateur" aria-labelledby="titre-calculateur" className="theme-sombre relative isolate z-10 scroll-mt-24 py-24 md:py-32">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_30rem_at_80%_10%,rgb(46_230_214/0.12),transparent_65%),radial-gradient(45rem_35rem_at_0%_80%,rgb(15_42_74/0.95),transparent_70%)]"
        />
        <FondLiquide />
        <div className="conteneur">
          <EnTeteSection
            id="titre-calculateur"
            surtitre="Calculateur"
            titre="Calculez votre prix."
            intro="Formule, gabarit, options et commune : le total s'affiche aussitôt, ligne par ligne."
          />
          <div className="mt-10">
            <Calculateur />
          </div>
        </div>
      </section>

      <section aria-labelledby="titre-faq-tarifs" className="theme-clair py-24 md:py-32">
        <div className="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <EnTeteSection id="titre-faq-tarifs" surtitre="Questions fréquentes" titre="À propos des prix" />
          <ListeFaq questions={questions(["prix", "animaux", "taches", "zones", "paiement"])} />
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
