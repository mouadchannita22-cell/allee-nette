import Link from "next/link";
import { CONDITIONS } from "@/data/conditions";
import { GARANTIE } from "@/data/offres";
import { fr } from "@/lib/typo";
import { AnneauGarantie } from "@/components/fx/AnneauGarantie";
import { AuPassage } from "@/components/fx/AuPassage";
import { BullesEcume } from "@/components/fx/BullesEcume";
import { GoutteOnde } from "@/components/fx/GoutteOnde";
import { EnTeteSection } from "./EnTetes";

/** Garantie Retouche 24 h, autour d'un anneau de minuterie qui se remplit au passage. */
export function Garantie() {
  return (
    <section className="theme-sombre relative isolate overflow-hidden py-24 md:py-32" aria-labelledby="titre-garantie">
      <BullesEcume />
      <div className="conteneur grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AuPassage seuil={0.5}>
          <AnneauGarantie heures={CONDITIONS.retoucheHeures}>
            <span aria-hidden="true">
              <span className="block text-7xl font-extrabold">{CONDITIONS.retoucheHeures}</span>
              <span className="text-xl font-bold">heures</span>
            </span>
          </AnneauGarantie>
        </AuPassage>
        <div>
          <EnTeteSection id="titre-garantie" surtitre={GARANTIE.nom} titre="Un point ne vous convient pas ? On revient." intro={GARANTIE.texte} />
          <ul className="mt-6 space-y-2 text-sm text-doux">
            {GARANTIE.limites.map((l) => (
              <li key={l}>• {l}.</li>
            ))}
            <li>
              • Exclusions et conditions détaillées dans nos{" "}
              <Link href="/cgv#garantie-retouche" className="font-semibold text-accent underline-offset-4 hover:underline">
                conditions générales de vente
              </Link>
              .
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/** « Sans rinçage, aucun rejet » : une goutte tombe et son onde traverse le titre. */
export function SansRincage() {
  return (
    <section className="theme-clair py-24 md:py-32" aria-labelledby="titre-sans-rincage">
      <AuPassage className="conteneur" seuil={0.35}>
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:gap-12">
          <GoutteOnde className="w-32 md:w-full" />
          <EnTeteSection
            id="titre-sans-rincage"
            surtitre="Sans rinçage, aucun rejet d'eau"
            titre={
              <span className="titre-onde">
                {fr(`Environ ${CONDITIONS.eauLitres} litres de notre eau.`)}
                <br />
                {fr("Rien dans le caniveau.")}
              </span>
            }
            intro="Nous lavons l'extérieur sans rinçage, panneau par panneau. Pas de jet, pas de haute pression, aucun écoulement chez vous ou dans la rue."
          />
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["Votre eau ?", "Inutile : nous apportons la nôtre."],
            ["Votre électricité ?", `Une prise à moins de ${CONDITIONS.priseElectriqueMetres} m. Nous avons une rallonge de ${CONDITIONS.rallongeMetres} m.`],
            ["La météo ?", "Pluie annoncée ou restriction d'eau : l'extérieur est reporté sans frais."],
          ].map(([titre, texte]) => (
            <li key={titre} className="rounded-carte border border-bord bg-blanc p-6 shadow-douce">
              <p className="font-semibold">{titre}</p>
              <p className="mt-1 text-doux">{texte}</p>
            </li>
          ))}
        </ul>
      </AuPassage>
    </section>
  );
}
