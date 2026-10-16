import { CONDITIONS } from "@/data/conditions";
import { EnTeteSection } from "./EnTetes";

export const ETAPES = [
  {
    titre: `Vous réservez et envoyez ${CONDITIONS.photosDemandees} photos.`,
    texte: "Deux minutes en ligne, ou par WhatsApp : l'habitacle avant, l'arrière et l'extérieur.",
  },
  {
    titre: `On confirme le prix ferme sous ${CONDITIONS.delaiPrixFermeHeures} heures.`,
    texte: "Avant tout rendez-vous. Ce prix ne bouge plus : aucun supplément surprise.",
  },
  {
    titre: "On vient à l'heure dite avec tout le matériel.",
    texte: `Il nous faut seulement une prise électrique à moins de ${CONDITIONS.priseElectriqueMetres} mètres. Pas besoin de votre eau.`,
  },
  {
    titre: "Vous contrôlez avec nous, vous payez après.",
    texte: "Carte, sans contact, PayPal ou espèces. Ou en ligne, par lien sécurisé.",
  },
] as const;

export function CommentCaMarche() {
  return (
    <section className="theme-clair py-24 md:py-32" aria-labelledby="titre-etapes">
      <div className="conteneur">
        <EnTeteSection
          id="titre-etapes"
          surtitre="Comment ça marche"
          titre="Quatre étapes, et vous ne bougez pas."
          intro={`Vous êtes là ${CONDITIONS.presenceMinutes} minutes au début et ${CONDITIONS.presenceMinutes} minutes à la fin. Le reste du temps, la journée est à vous.`}
        />
        <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <span className="font-titre text-sm font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-3 font-sans text-lg font-bold leading-snug tracking-normal">{e.titre}</h3>
              <p className="mt-2 text-doux">{e.texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
