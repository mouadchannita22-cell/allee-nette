import Link from "next/link";
import { site } from "@/config/site";
import { ACompleter } from "@/components/ui/ACompleter";
import { CONDITIONS } from "@/data/conditions";
import { OFFRES, formule } from "@/data/offres";
import { Bouton } from "@/components/ui/Bouton";
import { IconeFleche } from "@/components/ui/Icones";
import { EnTeteSection } from "./EnTetes";

/** Offre de lancement, tant qu'elle est active et qu'il reste des places (compteur mis à jour à la main). */
export function OffreLancement() {
  const o = OFFRES.lancement;
  if (!o.actif || o.placesRestantes <= 0) return null;
  return (
    <aside aria-labelledby="titre-lancement" className="theme-sombre">
      <div className="conteneur pb-4">
        <div className="flex flex-col gap-4 rounded-carte border border-alerte/40 bg-alerte/[0.08] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 id="titre-lancement" className="font-sans text-xl font-bold tracking-normal">
              {o.nom} : {o.placesTotal} premiers clients
            </h2>
            <p className="mt-1 text-doux">
              {o.avantages.join(", ")} sur {o.desodorisationOfferteSur.map((id) => formule(id).nom).join(" et ")}.
            </p>
          </div>
          <p className="shrink-0 font-semibold text-alerte">
            Places restantes : <span className="font-titre text-2xl tabular-nums">{o.placesRestantes}</span> sur{" "}
            {o.placesTotal}
          </p>
        </div>
      </div>
    </aside>
  );
}

/** « Qui sommes-nous », version courte. */
export function QuiSommesNous() {
  return (
    <section className="theme-clair py-24 md:py-32" aria-labelledby="titre-qui">
      <div className="conteneur">
        <EnTeteSection
          id="titre-qui"
          surtitre="Qui sommes-nous"
          titre="Deux entrepreneurs, près de chez vous."
          intro={
            <>
              Deux étudiants entrepreneurs de <ACompleter valeur={site.villeAssocies} libelle="votre ville" />, formés,
              assurés et équipés, qui préfèrent bien faire que vite faire.
            </>
          }
        />
        <Link href="/a-propos" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline">
          Faire connaissance <IconeFleche className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** Dernier appel à l'action d'une page. */
export function AppelFinal({ titre = site.promesse }: { titre?: string }) {
  return (
    <section className="theme-sombre py-24 md:py-32" aria-labelledby="titre-appel">
      <div className="conteneur text-center">
        <h2 id="titre-appel" className="mx-auto max-w-3xl text-3xl font-extrabold leading-[1.05] md:text-5xl">
          {titre}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-doux">
          Réservez en 2 minutes, envoyez {CONDITIONS.photosDemandees} photos : votre prix ferme arrive sous{" "}
          {CONDITIONS.delaiPrixFermeHeures} heures.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Bouton href="/reserver" taille="lg">
            Réserver mon nettoyage — prix ferme sous {CONDITIONS.delaiPrixFermeHeures} heures
          </Bouton>
          <Bouton href="/tarifs" variante="secondaire" taille="lg">
            Voir les tarifs
          </Bouton>
        </div>
      </div>
    </section>
  );
}
