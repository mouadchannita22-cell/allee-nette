/**
 * Typographie des textes longs (MDX de src/content et composants qu'ils
 * importent) : une seule source pour les titres, paragraphes et listes.
 * Les marges verticales viennent d'ici, la largeur de lecture de PageLegale.
 */
export const CLASSES_TEXTE = {
  h2: "mt-14 scroll-mt-28 font-titre text-xl font-bold leading-tight text-texte first:mt-0 md:text-2xl",
  h3: "mt-8 scroll-mt-28 font-sans text-lg font-bold tracking-normal text-texte",
  p: "mt-4 leading-relaxed",
  ul: "mt-4 list-disc space-y-2 pl-6 marker:text-accent",
  ol: "mt-4 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-accent",
  li: "pl-1 leading-relaxed",
  lien: "font-semibold text-accent underline underline-offset-4 [overflow-wrap:anywhere] hover:no-underline",
  citation: "mt-4 rounded-2xl border-l-4 border-accent bg-blanc px-5 py-4 shadow-douce",
  encadre: "mt-6 rounded-carte border border-bord-champ bg-blanc p-5 sm:p-6",
  /** Liste de définitions « terme : valeur » (identité, hébergeur…). */
  dl: "mt-4 divide-y divide-bord rounded-2xl border border-bord bg-blanc",
  ligneDl: "grid gap-1 px-4 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4",
  dt: "text-sm text-doux",
  dd: "font-semibold [overflow-wrap:anywhere]",
} as const;
