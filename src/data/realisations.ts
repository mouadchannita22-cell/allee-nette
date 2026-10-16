/**
 * Nos photos avant/après : uniquement les nôtres, publiées avec l'accord écrit
 * du client et les plaques floutées (partie 2.2 du brief).
 *
 * Pour en ajouter une :
 * 1. déposez les deux photos dans public/realisations/ (format JPG ou WebP,
 *    même cadrage avant et après, environ 1 600 px de large) ;
 * 2. renseignez `avant` et `apres` ci-dessous, avec un texte alternatif utile.
 *
 * Tant qu'une réalisation n'a pas ses photos, le site affiche un emplacement
 * marqué « Photo à venir ».
 */
export type PhotoRealisation = { src: string; alt: string };

export type Realisation = {
  id: string;
  libelle: string;
  avant?: PhotoRealisation;
  apres?: PhotoRealisation;
};

export const REALISATIONS: readonly Realisation[] = [
  { id: "habitacle-avant", libelle: "Habitacle avant" },
  { id: "sieges-arriere", libelle: "Sièges arrière" },
  { id: "carrosserie", libelle: "Carrosserie" },
];
