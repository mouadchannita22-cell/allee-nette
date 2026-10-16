import Link from "next/link";
import { CONDITIONS } from "@/data/conditions";
import { GARANTIE } from "@/data/offres";
import { EnTeteSection } from "./EnTetes";

/** Garantie Retouche 24 h. L'anneau de minuterie animé arrive à l'étape des effets. */
export function Garantie() {
  return (
    <section className="theme-sombre py-24 md:py-32" aria-labelledby="titre-garantie">
      <div className="conteneur grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div aria-hidden="true" className="mx-auto flex aspect-square w-full max-w-72 items-center justify-center rounded-full border-[10px] border-aqua/80 shadow-eclat">
          <span className="text-center font-titre">
            <span className="block text-7xl font-extrabold">{CONDITIONS.retoucheHeures}</span>
            <span className="text-xl font-bold">heures</span>
          </span>
        </div>
        <div>
          <EnTeteSection id="titre-garantie" surtitre={GARANTIE.nom} titre="Un point ne vous convient pas ? On revient." intro={GARANTIE.texte} />
          <ul className="mt-6 space-y-2 text-sm text-doux">
            {GARANTIE.limites.map((l) => (
              <li key={l}>• {l}.</li>
            ))}
            <li>
              • Exclusions et conditions détaillées dans nos{" "}
              <Link href="/cgv" className="font-semibold text-accent underline-offset-4 hover:underline">
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

/** « Sans rinçage, aucun rejet ». La goutte animée arrive à l'étape des effets. */
export function SansRincage() {
  return (
    <section className="theme-clair py-24 md:py-32" aria-labelledby="titre-sans-rincage">
      <div className="conteneur">
        <EnTeteSection
          id="titre-sans-rincage"
          surtitre="Sans rinçage, aucun rejet d'eau"
          titre={
            <>
              Environ {CONDITIONS.eauLitres} litres de notre eau.
              <br />
              Rien dans le caniveau.
            </>
          }
          intro="Nous lavons l'extérieur sans rinçage, panneau par panneau. Pas de jet, pas de haute pression, aucun écoulement chez vous ou dans la rue."
        />
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
      </div>
    </section>
  );
}
