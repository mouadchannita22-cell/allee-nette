import { OPTIONS } from "@/data/offres";
import { EnTeteSection } from "./EnTetes";

const prixSiege = OPTIONS.find((o) => o.id === "siege-enfant")?.prix;

const PROFILS = [
  {
    titre: "Les familles",
    texte: `Sièges enfants démontés et nettoyés${typeof prixSiege === "number" ? ` (+${prixSiege} € par siège)` : ""}, miettes, poils d'animaux : on s'en occupe pendant que vous restez à la maison.`,
  },
  {
    titre: "Les actifs pressés",
    texte: "Récupérez votre samedi. Pas de file à la station, pas d'aspirateur à pièces : vous ouvrez, on travaille.",
  },
  {
    titre: "Une vente ou une fin de location",
    texte: "Prêt à vendre ou à rendre : un habitacle propre en profondeur et des photos prises sur place.",
  },
  {
    titre: "Ceux qui ne peuvent plus aller en station",
    texte: "Mobilité réduite, pas de temps, pas d'envie : on vient à vous avec tout le matériel.",
  },
] as const;

export function PourQui() {
  return (
    <section className="theme-clair py-24 md:py-32" aria-labelledby="titre-pour-qui">
      <div className="conteneur">
        <EnTeteSection id="titre-pour-qui" surtitre="Pour qui" titre="Pour tous ceux qui ont mieux à faire." />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROFILS.map((p) => (
            <li key={p.titre} className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <h3 className="font-sans text-lg font-bold tracking-normal">{p.titre}</h3>
              <p className="mt-2 text-doux">{p.texte}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
