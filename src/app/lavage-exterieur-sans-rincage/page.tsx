import { zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { formule, option } from "@/data/offres";
import { questions } from "@/content/faq";
import { metadonnees } from "@/lib/seo";
import { Bouton } from "@/components/ui/Bouton";
import { EnTetePage, EnTeteSection } from "@/components/sections/EnTetes";
import { FicheFormule } from "@/components/sections/FicheFormule";
import { ListeFaq } from "@/components/sections/ListeFaq";
import { AppelFinal } from "@/components/sections/Divers";

const [c1, c2] = zoneActive.communesPrincipales;
const complet = formule("complet");
const exterieurSeul = option("exterieur-seul");

export const metadata = metadonnees({
  titre: `Lavage extérieur sans rinçage à domicile à ${c1}`,
  description: `Lavage de votre voiture chez vous à ${c1} et ${c2}, sans rinçage : environ ${CONDITIONS.eauLitres} litres de notre eau, aucun rejet. ${complet.nom}, intérieur et extérieur, dès ${complet.prix.S} €.`,
  chemin: "/lavage-exterieur-sans-rincage",
});

const METHODE = [
  {
    titre: "Notre eau, pas la vôtre",
    texte: `Nous apportons environ ${CONDITIONS.eauLitres} litres d'eau. Vous n'avez pas besoin de point d'eau.`,
  },
  {
    titre: "Panneau par panneau",
    texte: "Un produit de lavage sans rinçage, appliqué puis essuyé panneau par panneau. Pas de jet, pas de haute pression.",
  },
  { titre: "Rien dans le caniveau", texte: "Aucun écoulement : ni dans votre allée, ni dans la rue." },
  {
    titre: "Jantes, vitres, plastiques",
    texte: "Jantes côté visible, vitres extérieures et plastiques extérieurs sont compris dans Le Complet.",
  },
] as const;

export default function PageExterieur() {
  return (
    <>
      <EnTetePage
        surtitre="Lavage extérieur sans rinçage"
        titre="Votre carrosserie propre, sans une goutte dans le caniveau."
        intro={`Le lavage extérieur se fait sans rinçage, avec notre propre eau : environ ${CONDITIONS.eauLitres} litres, aucun rejet. Il fait partie du Complet, notre formule principale, intérieur et extérieur.`}
      >
        <Bouton href="/reserver?f=complet&g=M" taille="lg">
          Réserver {complet.nom}
        </Bouton>
        <Bouton href="/tarifs#calculateur" variante="secondaire" taille="lg">
          Calculer mon prix
        </Bouton>
      </EnTetePage>

      <section aria-labelledby="titre-methode" className="theme-sombre pb-24">
        <div className="conteneur">
          <EnTeteSection id="titre-methode" surtitre="La méthode" titre="Sans rinçage, aucun rejet d'eau." />
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {METHODE.map((m) => (
              <li key={m.titre} className="rounded-carte border border-bord bg-texte/[0.03] p-6">
                <h3 className="font-sans text-lg font-bold tracking-normal">{m.titre}</h3>
                <p className="mt-2 text-doux">{m.texte}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12 rounded-carte border border-alerte/40 bg-alerte/[0.08] p-6">
            <h3 className="font-sans text-lg font-bold tracking-normal">Conditions pour l'extérieur</h3>
            <ul className="mt-3 space-y-1.5 text-doux">
              <li>• Pas de pluie annoncée : sinon, l'extérieur est reporté sans frais. L'intérieur reste possible si la voiture est à l'abri.</li>
              <li>• En cas de restriction d'eau dans votre commune, l'extérieur est reporté sans frais.</li>
              <li>• Boue épaisse, goudron, décontamination et polissage ne sont pas compris.</li>
            </ul>
          </div>
        </div>
      </section>

      <FicheFormule id="complet" />

      <section aria-labelledby="titre-exterieur-seul" className="theme-sombre py-20">
        <div className="conteneur flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="titre-exterieur-seul" className="text-2xl font-bold md:text-3xl">
              {exterieurSeul.libelle} : {typeof exterieurSeul.prix === "number" ? `${exterieurSeul.prix} €` : ""}
            </h2>
            <p className="mt-3 text-doux">
              {exterieurSeul.regle}. Pour un extérieur seul hors tournée, choisissez plutôt {complet.nom} : intérieur
              compris.
            </p>
          </div>
          <Bouton href="/tarifs#tableau-options" variante="secondaire">
            Voir toutes les options
          </Bouton>
        </div>
      </section>

      <section aria-labelledby="titre-faq-exterieur" className="theme-clair py-24 md:py-32">
        <div className="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <EnTeteSection id="titre-faq-exterieur" surtitre="Questions fréquentes" titre="Avant de réserver" />
          <ListeFaq questions={questions(["eau", "electricite", "pluie", "copropriete", "presence"])} />
        </div>
      </section>

      <AppelFinal />
    </>
  );
}
