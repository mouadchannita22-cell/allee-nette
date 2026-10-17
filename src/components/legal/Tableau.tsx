import { fr } from "@/lib/typo";

/**
 * Tableau à deux colonnes pour les textes MDX (src/content), qui n'ont pas la
 * syntaxe des tableaux Markdown (aucune extension de Markdown, voir
 * next.config.ts). Textes courts : il tient sans défilement à 375 px.
 */
export function Tableau({
  legende,
  entetes,
  lignes,
}: {
  legende: string;
  entetes: readonly [string, string];
  lignes: readonly (readonly [string, string])[];
}) {
  const th = "px-3 py-2.5 text-left align-bottom text-sm font-semibold text-doux sm:px-4";
  const td = "border-t border-bord px-3 py-3 align-top sm:px-4";
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-bord bg-blanc">
      <table className="w-full text-left">
        <caption className="px-3 pt-3 text-left text-sm text-doux sm:px-4">{fr(legende)}</caption>
        <thead>
          <tr>
            {entetes.map((e) => (
              <th key={e} scope="col" className={th}>
                {fr(e)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map(([gauche, droite]) => (
            <tr key={gauche}>
              <th scope="row" className={`${td} w-1/2 font-normal`}>
                {fr(gauche)}
              </th>
              <td className={`${td} font-semibold`}>{fr(droite)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
