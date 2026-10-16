import { communesDesservies, ZONE_ACTIVE, zoneActive } from "@/config/site";

/** Données produites par `npm run carte` (public/carte-zone.json). */
export type DonneesCarte = {
  zone: string;
  vue: [number, number, number, number];
  rayons: { zone1: number; zone2: number };
  communes: { insee: string; nom: string; zone: 0 | 1 | 2; d: string; centre: [number, number] }[];
};

/** Légende et attribution, affichées aussi pendant le chargement (même hauteur). */
function Legende() {
  return (
    <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-doux">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-sm bg-aqua/60" /> Zone 1
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-sm bg-aqua/25" /> Zone 2
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-sm border border-bord" /> Sur demande
      </span>
      <span className="w-full text-xs">Contours des communes : IGN Admin Express, Licence Ouverte 2.0.</span>
    </figcaption>
  );
}

/**
 * Carte stylisée des communes desservies : zone 1 et zone 2 en deux intensités
 * d'aqua, communes voisines en gris, ondes depuis notre point de départ.
 * Sans données (chargement, ou carte générée pour une autre zone) : un cadre
 * de même taille, sans décalage de mise en page.
 */
export function CarteZones({ carte }: { carte: DonneesCarte | null }) {
  const valide = carte?.zone === ZONE_ACTIVE ? carte : null;
  if (!valide) {
    return (
      <figure className="carte-zones">
        <div aria-hidden="true" className="aspect-square w-full rounded-carte bg-texte/[0.03]" />
        <Legende />
      </figure>
    );
  }

  const [x, y, largeur, hauteur] = valide.vue;
  const { zone1, zone2 } = valide.rayons;
  const ville = valide.communes.find((c) => c.nom === zoneActive.ville);

  return (
    <figure className="carte-zones">
      <svg viewBox={`${x} ${y} ${largeur} ${hauteur}`} role="img" aria-labelledby="titre-carte-zones" className="aspect-square w-full">
        <title id="titre-carte-zones">
          {`Carte des ${communesDesservies().length} communes desservies autour de ${zoneActive.ville} : zone 1 jusqu'à ${zoneActive.rayons.zone1} km, zone 2 jusqu'à ${zoneActive.rayons.zone2} km.`}
        </title>
        <defs>
          <radialGradient id="carte-lueur">
            <stop offset="0" stopColor="#2ee6d6" stopOpacity="0.22" />
            <stop offset="1" stopColor="#2ee6d6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r={zone2 * 1.1} fill="url(#carte-lueur)" />
        <g>
          {valide.communes.map((c) => (
            <path key={c.insee} d={c.d} data-insee={c.insee} data-zone={c.zone}>
              {c.zone ? <title>{`${c.nom} : zone ${c.zone}`}</title> : null}
            </path>
          ))}
        </g>
        <circle r={zone1} className="rayon-carte" />
        <circle r={zone2} className="rayon-carte" />
        <text x={zone1 * 0.72} y={-zone1 * 0.72} className="legende-rayon">
          {zoneActive.rayons.zone1} km
        </text>
        <text x={zone2 * 0.72} y={-zone2 * 0.72} className="legende-rayon">
          {zoneActive.rayons.zone2} km
        </text>
        {[0, 1, 2].map((i) => (
          <circle key={i} r={zone2} className="onde-carte" style={{ animationDelay: `${i * 1.6}s` }} />
        ))}
        <circle r="5" fill="#2ee6d6" stroke="#0b1220" strokeWidth="2" />
        {ville ? (
          <text x={ville.centre[0]} y={ville.centre[1] + 22} textAnchor="middle" className="nom-ville">
            {ville.nom}
          </text>
        ) : null}
      </svg>
      <Legende />
    </figure>
  );
}
