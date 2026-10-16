import { site, zoneActive } from "@/config/site";
import { prixMinimum } from "@/data/offres";
import { Bouton } from "@/components/ui/Bouton";
import { IconeFleche } from "@/components/ui/Icones";

const REASSURANCE = [
  "Assurance professionnelle",
  "Sans rinçage, aucun rejet d'eau",
  "Photos avant/après le soir même",
  "Retouche gratuite sous 24 h",
  "Paiement après la prestation",
] as const;

const ETAPES = [
  { titre: "Vous réservez et envoyez 3 photos.", texte: "Deux minutes en ligne, ou par WhatsApp." },
  { titre: "On confirme le prix ferme sous 2 heures.", texte: "Avant tout rendez-vous. Aucun supplément surprise." },
  {
    titre: "On vient à l'heure dite avec tout le matériel.",
    texte: "Il nous faut seulement une prise électrique à moins de 20 mètres.",
  },
  { titre: "Vous contrôlez avec nous, vous payez après.", texte: "Carte, sans contact, PayPal ou espèces." },
] as const;

export default function Accueil() {
  const [c1, c2, c3] = zoneActive.communesPrincipales;

  return (
    <>
      <section className="theme-sombre relative isolate overflow-hidden">
        {/* Fond de repli du héros : le pare-brise WebGL viendra se poser ici (étape 5). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_75%_20%,rgb(46_230_214/0.16),transparent_60%),radial-gradient(50rem_30rem_at_10%_90%,rgb(15_42_74/0.9),transparent_70%)]"
        />
        <div className="conteneur flex min-h-[100svh] flex-col justify-end pb-16 pt-32 md:justify-center md:pb-24">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Nettoyage auto à domicile · {zoneActive.ville} et alentours
          </p>
          <h1 className="max-w-4xl text-[clamp(2.5rem,7.2vw,5.75rem)] font-extrabold leading-[0.98]">
            {site.promesse}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-doux md:text-xl">
            Nettoyage intérieur et extérieur à domicile, à {c1}, {c2}, {c3}. Prix fermes validés sur vos photos avant
            le rendez-vous. Aucun supplément surprise.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Bouton href="/reserver" taille="lg">
              Réserver mon nettoyage — prix ferme sous 2 heures
            </Bouton>
            <Bouton href="/tarifs" variante="secondaire" taille="lg">
              Voir les tarifs <span className="font-normal text-doux">dès {prixMinimum()} €</span>
              <IconeFleche className="size-4" />
            </Bouton>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-bord pt-6 text-sm text-doux">
            {REASSURANCE.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-aqua" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="theme-clair py-24" aria-labelledby="titre-etapes">
        <div className="conteneur">
          <h2 id="titre-etapes" className="max-w-2xl text-3xl font-bold md:text-5xl">
            Comment ça marche
          </h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
    </>
  );
}
