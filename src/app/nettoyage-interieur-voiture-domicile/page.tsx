import { zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { formule } from "@/data/offres";
import { questions } from "@/content/faq";
import { metadonnees } from "@/lib/seo";
import { Bouton } from "@/components/ui/Bouton";
import { EnTetePage, EnTeteSection } from "@/components/sections/EnTetes";
import { FicheFormule } from "@/components/sections/FicheFormule";
import { AvantApres } from "@/components/sections/AvantApres";
import { ListeFaq } from "@/components/sections/ListeFaq";
import { AppelFinal } from "@/components/sections/Divers";

const [c1] = zoneActive.communesPrincipales;
const net = formule("interieur-net");
const soin = formule("grand-soin");

export const metadata = metadonnees({
  titre: `Nettoyage intérieur de voiture à domicile à ${c1}`,
  description: `Nettoyage intérieur de votre voiture chez vous, à ${c1} et alentours. ${net.nom} dès ${net.prix.S} €, ${soin.nomCourt} dès ${soin.prix.S} €. Prix ferme sur photos.`,
  chemin: "/nettoyage-interieur-voiture-domicile",
});

export default function PageInterieur() {
  return (
    <>
      <EnTetePage
        surtitre="Nettoyage intérieur à domicile"
        titre="Un habitacle propre, sans quitter la maison."
        intro={`Aspiration, plastiques, vitres, et si besoin shampooing en profondeur : nous nettoyons l'intérieur de votre voiture chez vous, à ${c1} et alentour. Deux formules, selon l'état de l'habitacle.`}
      >
        <Bouton href="/reserver?f=interieur-net&g=M" taille="lg">
          Réserver un nettoyage intérieur
        </Bouton>
        <Bouton href="/tarifs#calculateur" variante="secondaire" taille="lg">
          Calculer mon prix
        </Bouton>
      </EnTetePage>

      <section aria-labelledby="titre-choix" className="theme-sombre pb-20">
        <div className="conteneur">
          <h2 id="titre-choix" className="font-sans text-xl font-bold tracking-normal">
            Laquelle choisir ?
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[net, soin].map((f) => (
              <a
                key={f.id}
                href={`#fiche-${f.id}`}
                className="rounded-carte border border-bord bg-texte/[0.03] p-6 transition-colors hover:border-accent"
              >
                <p className="text-sm font-semibold text-accent">{f.positionnement}</p>
                <p className="mt-1 text-xl font-bold">{f.nom}</p>
                <p className="mt-2 text-doux">{f.pourQui}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FicheFormule id="interieur-net" />
      <div className="theme-clair">
        <div className="conteneur">
          <hr className="border-bord" />
        </div>
      </div>
      <FicheFormule id="grand-soin" />

      <AvantApres titre="L'intérieur, avant et après." />

      <section aria-labelledby="titre-faq-interieur" className="theme-clair py-24 md:py-32">
        <div className="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <EnTeteSection
            id="titre-faq-interieur"
            surtitre="Questions fréquentes"
            titre="Avant de réserver"
            intro={`Vous êtes là ${CONDITIONS.presenceMinutes} minutes au début et à la fin, et c'est tout.`}
          />
          <ListeFaq questions={questions(["sieges-mouilles", "taches", "animaux", "electricite", "duree"])} />
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
