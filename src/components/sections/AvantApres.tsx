import { EnTeteSection } from "./EnTetes";

/**
 * Avant/après. Uniquement nos propres photos, avec l'accord écrit du client
 * et les plaques floutées. En attendant : des emplacements clairement marqués.
 * Le curseur « glisser pour nettoyer » arrive à l'étape des effets.
 */
export function AvantApres({ titre = "Avant, après." }: { titre?: string }) {
  return (
    <section className="theme-sombre py-24 md:py-32" aria-labelledby="titre-avant-apres">
      <div className="conteneur">
        <EnTeteSection
          id="titre-avant-apres"
          surtitre="Nos réalisations"
          titre={titre}
          intro="Ici, uniquement nos propres photos, publiées avec l'accord du client et les plaques floutées. Les premières arrivent avec nos premiers clients."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {["Habitacle avant", "Sièges arrière", "Carrosserie"].map((libelle) => (
            <li key={libelle}>
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-carte border-2 border-dashed border-bord bg-texte/[0.03] text-center">
                <span className="font-titre text-lg font-bold">Photo à venir</span>
                <span className="mt-1 text-sm text-doux">{libelle}, avant / après</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
