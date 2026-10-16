import { CONDITIONS } from "@/data/conditions";
import { GABARITS, OPTIONS, duree, formule, type FormuleId, type OptionTarif } from "@/data/offres";
import { disponibilite } from "@/lib/prix";
import { euros } from "@/lib/texte";
import { Bouton } from "@/components/ui/Bouton";
import { MentionPrix } from "./MentionPrix";

function prixOption(o: OptionTarif): string {
  if (typeof o.prix !== "number") return `+${o.prix.min} à +${o.prix.max} €, sur photos`;
  return o.unite ? `+${o.prix} € par ${o.unite.singulier}` : o.id === "exterieur-seul" ? `${o.prix} €` : `+${o.prix} €`;
}

/** Fiche détaillée d'une formule (modèle de la partie 11.2 du brief). */
export function FicheFormule({ id, niveauTitre = 2 }: { id: FormuleId; niveauTitre?: 1 | 2 }) {
  const f = formule(id);
  const options = OPTIONS.filter((o) => disponibilite(id, o.id).disponible && !o.aConfirmerSurPhotos);
  const Titre = niveauTitre === 1 ? "h1" : "h2";

  return (
    <article className="theme-clair py-20 md:py-28" aria-labelledby={`fiche-${id}`}>
      <div className="conteneur grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{f.positionnement}</p>
          <Titre id={`fiche-${id}`} className="mt-3 text-3xl font-bold leading-[1.08] md:text-4xl">
            {f.titrePage}
          </Titre>
          <p className="mt-5 text-lg">
            <span className="font-semibold">Pour qui : </span>
            <span className="text-doux">{f.pourQui}</span>
          </p>
          <blockquote className="mt-6 border-l-4 border-aqua pl-5 text-lg italic text-doux">« {f.argument} »</blockquote>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-sans text-lg font-bold tracking-normal">Inclus</h3>
              <ul className="mt-3 space-y-2">
                {f.inclus.map((i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden="true" className="font-bold text-accent">
                      ✓
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold tracking-normal">Non inclus</h3>
              <ul className="mt-3 space-y-2 text-doux">
                {f.nonInclus.map((i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden="true">–</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {options.length > 0 && (
            <div className="mt-10">
              <h3 className="font-sans text-lg font-bold tracking-normal">En option</h3>
              <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {options.map((o) => (
                  <li key={o.id} className="flex justify-between gap-4 border-b border-bord py-1.5 text-sm">
                    <span>{o.libelle}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{prixOption(o)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10">
            <h3 className="font-sans text-lg font-bold tracking-normal">Conditions</h3>
            <ul className="mt-3 space-y-2 text-doux">
              <li>• Voiture garée dans votre allée, votre cour ou votre garage, ou sur votre place de copropriété avec l'accord écrit du syndic.</li>
              <li>• Une prise électrique à moins de {CONDITIONS.priseElectriqueMetres} mètres. Pas besoin de point d'eau.</li>
              <li>• Vous êtes là {CONDITIONS.presenceMinutes} minutes au début et à la fin ; pensez à retirer vos objets de valeur.</li>
              {f.avecExterieur && <li>• Pas de pluie annoncée pour l'extérieur : sinon, nous reportons sans frais.</li>}
              {f.aSavoir && <li>• {f.aSavoir}</li>}
            </ul>
          </div>
        </div>

        <aside className="self-start rounded-carte border border-bord bg-blanc p-6 shadow-douce sm:p-8 lg:sticky lg:top-28">
          <h3 className="font-sans text-lg font-bold tracking-normal">{f.nom}</h3>
          <p className="mt-1 text-sm text-doux">
            Sur place : {duree(f)}
            {f.sechage ? `, ${f.sechage}` : ""}
          </p>
          <dl className="mt-6 divide-y divide-bord">
            {GABARITS.map((g) => (
              <div key={g.code} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-sm">
                  <span className="font-titre font-bold">{g.code}</span> <span className="text-doux">{g.libelleCourt}</span>
                </dt>
                <dd className="font-titre text-2xl font-extrabold tabular-nums">{euros(f.prix[g.code])}</dd>
              </div>
            ))}
          </dl>
          <MentionPrix className="mt-2" />
          <Bouton href={`/reserver?f=${f.id}&g=M`} taille="lg" className="mt-6 w-full">
            Réserver {f.nom}
          </Bouton>
          <p className="mt-3 text-center text-xs text-doux">
            Prix ferme confirmé sur vos photos sous {CONDITIONS.delaiPrixFermeHeures} heures.
          </p>
        </aside>
      </div>
    </article>
  );
}
