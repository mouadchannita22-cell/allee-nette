import { site, zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { GARANTIE, prixMinimum } from "@/data/offres";
import { questions } from "@/content/faq";
import { Bouton } from "@/components/ui/Bouton";
import { IconeFleche } from "@/components/ui/Icones";
import { Calculateur } from "@/components/tarifs/Calculateur";
import { CommentCaMarche } from "@/components/sections/CommentCaMarche";
import { FormulesApercu } from "@/components/sections/FormulesApercu";
import { Garantie, SansRincage } from "@/components/sections/Engagements";
import { PourQui } from "@/components/sections/PourQui";
import { AvantApres } from "@/components/sections/AvantApres";
import { ZonesResume } from "@/components/sections/ZonesResume";
import { AppelFinal, OffreLancement, QuiSommesNous } from "@/components/sections/Divers";
import { EnTeteSection } from "@/components/sections/EnTetes";
import { ListeFaq } from "@/components/sections/ListeFaq";
import Link from "next/link";

const REASSURANCE = [
  "Assurance professionnelle",
  "Sans rinçage, aucun rejet d'eau",
  "Photos avant/après le soir même",
  `Retouche gratuite sous ${CONDITIONS.retoucheHeures} h`,
  "Paiement après la prestation",
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
          <h1 className="max-w-5xl text-[clamp(2.5rem,7vw,5.25rem)] font-extrabold leading-[0.98]">{site.promesse}</h1>
          <p className="mt-6 max-w-2xl text-lg text-doux md:text-xl">
            Nettoyage intérieur et extérieur à domicile, à {c1}, {c2}, {c3}. Prix fermes validés sur vos photos avant le
            rendez-vous. Aucun supplément surprise.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Bouton href="/reserver" taille="lg">
              Réserver mon nettoyage — prix ferme sous {CONDITIONS.delaiPrixFermeHeures} heures
            </Bouton>
            <Bouton href="/tarifs#grille" variante="secondaire" taille="lg">
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

      <CommentCaMarche />
      <FormulesApercu />
      <OffreLancement />

      <section className="theme-sombre relative z-10 pb-24 pt-12 md:pb-32" aria-labelledby="titre-estimation">
        <div className="conteneur">
          <EnTeteSection
            id="titre-estimation"
            surtitre="Estimation immédiate"
            titre="Votre prix, en trois clics."
            intro="Choisissez la formule, le gabarit et votre commune. Pour les options, les abonnements et les codes, le calculateur complet est sur la page Tarifs."
          />
          <div className="mt-10">
            <Calculateur compact />
          </div>
        </div>
      </section>

      <Garantie />
      <SansRincage />
      <AvantApres />
      <PourQui />
      <ZonesResume />
      <QuiSommesNous />

      <section className="theme-clair pb-24 md:pb-32" aria-labelledby="titre-faq-courte">
        <div className="conteneur grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div>
            <EnTeteSection id="titre-faq-courte" surtitre="Questions fréquentes" titre="Vous vous demandez sûrement…" />
            <Link href="/faq" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline">
              Toutes les questions <IconeFleche className="size-4" />
            </Link>
          </div>
          <ListeFaq questions={questions(["eau", "electricite", "presence", "paiement", "prix", "pluie"])} />
        </div>
      </section>

      <AppelFinal titre={`${GARANTIE.nom.replace("Garantie ", "")} incluse, prix ferme avant le rendez-vous.`} />
    </>
  );
}
