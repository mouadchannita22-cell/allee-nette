import { zoneActive } from "@/config/site";
import { prixMinimum } from "@/data/offres";
import { metadonnees } from "@/lib/seo";
import { Calculateur } from "@/components/tarifs/Calculateur";

const [c1, c2] = zoneActive.communesPrincipales;

export const metadata = metadonnees({
  titre: "Tarifs et formules",
  description: `Prix fermes par gabarit, dès ${prixMinimum()} €, déplacement inclus à ${c1} et ${c2}. Calculez votre prix : formule, options, zone. Validé sur vos photos sous 2 heures.`,
  chemin: "/tarifs",
});

export default function PageTarifs() {
  return (
    <>
      <section className="theme-sombre pb-10 pt-36 md:pt-44">
        <div className="conteneur">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Tarifs et formules</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.02] md:text-6xl">
            Des prix fermes, par gabarit.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-doux">
            Choisissez votre formule, vos options et votre commune : le total s'affiche aussitôt. Nous le confirmons
            sur vos photos sous 2 heures, avant tout rendez-vous.
          </p>
        </div>
      </section>

      {/* z-10 : la liste des communes passe au-dessus de la vague du pied de page. */}
      <section id="calculateur" aria-labelledby="titre-calculateur" className="theme-sombre relative isolate z-10 pb-24">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(40rem_30rem_at_80%_10%,rgb(46_230_214/0.12),transparent_65%),radial-gradient(45rem_35rem_at_0%_80%,rgb(15_42_74/0.95),transparent_70%)]"
        />
        <div className="conteneur">
          <h2 id="titre-calculateur" className="mb-8 text-2xl font-bold md:text-3xl">
            Calculez votre prix
          </h2>
          <Calculateur />
        </div>
      </section>
    </>
  );
}
