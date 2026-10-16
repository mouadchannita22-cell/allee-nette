import { REALISATIONS } from "@/data/realisations";
import { Comparateur } from "@/components/fx/Comparateur";
import { EnTeteSection } from "./EnTetes";

/**
 * Avant/après « glisser pour nettoyer ». Uniquement nos propres photos, avec
 * l'accord écrit du client et les plaques floutées (data/realisations.ts).
 * En attendant : des emplacements clairement marqués « Photo à venir ».
 */
export function AvantApres({ titre = "Avant, après." }: { titre?: string }) {
  return (
    <section className="theme-sombre py-24 md:py-32" aria-labelledby="titre-avant-apres">
      <div className="conteneur">
        <EnTeteSection
          id="titre-avant-apres"
          surtitre="Nos réalisations"
          titre={titre}
          intro="Ici, uniquement nos propres photos, publiées avec l'accord du client et les plaques floutées. Les premières arrivent avec nos premiers clients. Faites glisser la raclette pour comparer."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {REALISATIONS.map((r) => (
            <li key={r.id}>
              <Comparateur libelle={r.libelle} avant={r.avant} apres={r.apres} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
