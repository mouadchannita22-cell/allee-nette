import type { ReactNode } from "react";
import { CONDITIONS, PAIEMENT_SUR_PLACE } from "@/data/conditions";
import { formule, GABARITS } from "@/data/offres";
import { euros } from "@/lib/texte";
import { EtapesEpinglees } from "@/components/fx/EtapesEpinglees";
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

/* ---------------------------------------------------------------------------
   Écrans du téléphone : décoratifs (le texte réel est dans la liste des étapes).
   --------------------------------------------------------------------------- */

function Entete({ titre }: { titre: string }) {
  return (
    <p className="mb-3 flex items-center justify-between font-semibold">
      {titre}
      <span className="size-1.5 rounded-full bg-aqua shadow-[0_0_8px_#2ee6d6]" />
    </p>
  );
}

function Coche() {
  return <span className="inline-flex size-[1.4em] items-center justify-center rounded-full bg-aqua font-bold text-nuit">✓</span>;
}

const exemple = formule("complet");
const gabaritExemple = GABARITS.find((g) => g.code === "M")!;

const ECRANS: ReactNode[] = [
  <div key="photos" className="flex h-full flex-col">
    <Entete titre="Ma demande" />
    <p className="text-brume">
      {exemple.nom} · {gabaritExemple.libelleCourt}
    </p>
    <ul className="mt-3 grid grid-cols-3 gap-1.5">
      {["Avant", "Arrière", "Extérieur"].map((vue) => (
        <li key={vue} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-aqua/40 bg-aqua/10">
          <Coche />
          <span className="text-[0.85em] text-brume">{vue}</span>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-brume">
      {CONDITIONS.photosDemandees} photos sur {CONDITIONS.photosDemandees}
    </p>
    <p className="mt-auto rounded-full bg-aqua py-2 text-center font-semibold text-nuit">Envoyer ma demande</p>
  </div>,

  <div key="prix" className="flex h-full flex-col">
    <Entete titre="Allée Nette" />
    <p className="w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">Bonjour, vos photos sont bien reçues.</p>
    <div className="mt-2 w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
      <p className="text-brume">Prix ferme confirmé</p>
      <p className="font-titre text-[2.2em] font-extrabold leading-tight text-aqua">{euros(exemple.prix.M)}</p>
      <p>
        {exemple.nom} · {gabaritExemple.libelleCourt}
      </p>
      <p className="mt-1 text-brume">Aucun supplément sur place.</p>
    </div>
    <p className="mt-2 text-right text-[0.85em] text-brume">Sous {CONDITIONS.delaiPrixFermeHeures} h</p>
  </div>,

  <div key="venue" className="flex h-full flex-col">
    <Entete titre="Rendez-vous" />
    <div className="relative h-[34%] overflow-hidden rounded-xl bg-[#0f2a4a]">
      <svg viewBox="0 0 120 60" className="absolute inset-0 h-full w-full">
        <path
          d="M8 50 C 30 50, 30 14, 60 20 S 96 44, 112 12"
          fill="none"
          stroke="#2ee6d6"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="trajet-pointille"
        />
        <circle cx="112" cy="12" r="5" fill="#f3fafc" />
        <circle cx="8" cy="50" r="4" fill="#2ee6d6" />
      </svg>
    </div>
    <p className="mt-3 font-semibold">Nous arrivons avec tout le matériel</p>
    <ul className="mt-2 space-y-1.5 text-brume">
      <li className="flex items-center gap-2">
        <Coche /> Notre eau, environ {CONDITIONS.eauLitres} L
      </li>
      <li className="flex items-center gap-2">
        <Coche /> Aspirateur et microfibres
      </li>
      <li className="flex items-center gap-2">
        <Coche /> Une prise à moins de {CONDITIONS.priseElectriqueMetres} m
      </li>
    </ul>
  </div>,

  <div key="paiement" className="flex h-full flex-col">
    <Entete titre="C'est propre" />
    <ul className="space-y-1.5">
      {["Intérieur contrôlé", "Extérieur contrôlé", "Photos avant/après"].map((c) => (
        <li key={c} className="flex items-center gap-2">
          <Coche /> {c}
        </li>
      ))}
    </ul>
    <p className="mt-4 font-semibold">Payer après la prestation</p>
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {PAIEMENT_SUR_PLACE.map((m) => (
        <li key={m} className="rounded-full border border-aqua/40 px-2 py-1 text-brume">
          {m}
        </li>
      ))}
    </ul>
    <p className="mt-4 rounded-full bg-aqua py-2 text-center font-semibold text-nuit">
      Payer {euros(exemple.prix.M)}
    </p>
  </div>,
];

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
        <EtapesEpinglees etapes={ETAPES} ecrans={ECRANS} />
      </div>
    </section>
  );
}
