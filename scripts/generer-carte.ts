/**
 * Génère la carte des communes desservies par la zone active (config/site.ts) :
 * contours projetés autour du point de départ, simplifiés, en chemins SVG.
 *
 * Usage :
 *   node scripts/generer-carte.ts
 *     → contours téléchargés depuis geo.api.gouv.fr ;
 *   node scripts/generer-carte.ts --source <fichier.geojson> [<fichier.geojson>…]
 *     → contours lus dans des fichiers GeoJSON locaux (propriétés `code` et `nom`).
 *
 * Sortie : public/carte-zone.json, chargé par la page Zones après l'affichage
 * (la carte ne pèse pas sur le premier rendu). À relancer après un changement
 * de zone active ou de liste de communes.
 *
 * Contours : IGN Admin Express, Licence Ouverte 2.0 (Etalab), attribution
 * affichée sous la carte.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PREREGLAGES, ZONE_ACTIVE, type Commune } from "../src/config/site.ts";

type Position = [number, number];
type Geometrie = { type: "Polygon"; coordinates: Position[][] } | { type: "MultiPolygon"; coordinates: Position[][][] };
type Entite = { properties: { code: string; nom: string }; geometry: Geometrie };

/** Une unité SVG = 100 m. */
const ECHELLE = 10;
/** Tolérance de simplification, en unités SVG : 150 m pour les communes desservies, 300 m pour les voisines. */
const TOLERANCE = { desservie: 1.5, voisine: 3 };
/** Marge autour de la zone 2 : on montre aussi les communes voisines, en gris. */
const MARGE = 1.22;

const zone = PREREGLAGES[ZONE_ACTIVE];
const { lon: lon0, lat: lat0 } = zone.depart;
const desservies = new Map<string, { commune: Commune; zone: 1 | 2 }>();
for (const c of zone.zone1) desservies.set(c.insee, { commune: c, zone: 1 });
for (const c of zone.zone2) desservies.set(c.insee, { commune: c, zone: 2 });
const demi = zone.rayons.zone2 * MARGE * ECHELLE;

/** Projection équirectangulaire locale : précise à l'échelle d'une quarantaine de kilomètres. */
function projeter([lon, lat]: Position): Position {
  const x = (lon - lon0) * 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const y = (lat0 - lat) * 110.574;
  return [x * ECHELLE, y * ECHELLE];
}

/** Douglas-Peucker : retire les points qui s'écartent de moins de `tolerance` du tracé. */
function simplifier(points: Position[], tolerance: number): Position[] {
  if (points.length <= 4) return points;
  const garder = new Uint8Array(points.length);
  garder[0] = garder[points.length - 1] = 1;
  const pile: [number, number][] = [[0, points.length - 1]];
  while (pile.length) {
    const [debut, fin] = pile.pop()!;
    const [ax, ay] = points[debut]!;
    const [bx, by] = points[fin]!;
    const dx = bx - ax;
    const dy = by - ay;
    const longueur = Math.hypot(dx, dy) || 1;
    let maximum = 0;
    let indice = -1;
    for (let i = debut + 1; i < fin; i++) {
      const [px, py] = points[i]!;
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / longueur;
      if (d > maximum) {
        maximum = d;
        indice = i;
      }
    }
    if (maximum > tolerance && indice > 0) {
      garder[indice] = 1;
      pile.push([debut, indice], [indice, fin]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

function anneaux(g: Geometrie): Position[][] {
  return g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
}

/**
 * Un anneau est fermé (premier point = dernier point) : on le coupe au point
 * le plus éloigné du départ, sinon Douglas-Peucker ne garde rien.
 */
function simplifierAnneau(points: Position[], tolerance: number): Position[] {
  const [x0, y0] = points[0]!;
  let loin = 0;
  points.forEach(([x, y], i) => {
    if (Math.hypot(x - x0, y - y0) > Math.hypot(points[loin]![0] - x0, points[loin]![1] - y0)) loin = i;
  });
  if (loin === 0) return points;
  return [...simplifier(points.slice(0, loin + 1), tolerance), ...simplifier(points.slice(loin), tolerance).slice(1)];
}

/** Chemin SVG compact : coordonnées entières (1 unité = 100 m), déplacements relatifs. */
function chemin(g: Geometrie, tolerance: number): string {
  return anneaux(g)
    .map((anneau) => simplifierAnneau(anneau.map(projeter), tolerance).map(([x, y]): Position => [Math.round(x), Math.round(y)]))
    .filter((a) => a.length >= 4)
    .map((a) => {
      let [px, py] = a[0]!;
      let d = `M${px} ${py}l`;
      for (const [x, y] of a.slice(1, -1)) {
        if (x === px && y === py) continue;
        d += `${x - px} ${y - py} `.replace(/ -/g, "-");
        [px, py] = [x, y];
      }
      return d.trimEnd().replace(/ -/g, "-") + "z";
    })
    .join("");
}

/** Centre de gravité du plus grand anneau : point d'ancrage de l'étiquette. */
function centre(g: Geometrie): Position {
  const plusGrand = anneaux(g)
    .map((a) => a.map(projeter))
    .sort((a, b) => b.length - a.length)[0]!;
  let aire = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < plusGrand.length - 1; i++) {
    const [x1, y1] = plusGrand[i]!;
    const [x2, y2] = plusGrand[i + 1]!;
    const f = x1 * y2 - x2 * y1;
    aire += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [Math.round(cx / (3 * aire)), Math.round(cy / (3 * aire))];
}

function dansLeCadre(g: Geometrie): boolean {
  return anneaux(g).some((a) =>
    a.some((p) => {
      const [x, y] = projeter(p);
      return Math.abs(x) <= demi && Math.abs(y) <= demi;
    }),
  );
}

async function lireEntites(): Promise<{ entites: Entite[]; source: string }> {
  const i = process.argv.indexOf("--source");
  if (i >= 0) {
    const fichiers = process.argv.slice(i + 1);
    const entites: Entite[] = [];
    for (const f of fichiers) entites.push(...(JSON.parse(await readFile(f, "utf8")) as { features: Entite[] }).features);
    return { entites, source: "fichiers locaux" };
  }
  const departements = new Set([...desservies.keys()].map((code) => code.slice(0, 2)));
  const entites: Entite[] = [];
  for (const d of departements) {
    const url = `https://geo.api.gouv.fr/departements/${d}/communes?fields=code,nom&format=geojson&geometry=contour`;
    const reponse = await fetch(url);
    if (!reponse.ok) throw new Error(`${url} : ${reponse.status}`);
    entites.push(...((await reponse.json()) as { features: Entite[] }).features);
  }
  return { entites, source: "geo.api.gouv.fr" };
}

const { entites, source } = await lireEntites();
const communes = entites
  .filter((e) => desservies.has(e.properties.code) || dansLeCadre(e.geometry))
  .map((e) => {
    const d = desservies.get(e.properties.code);
    return {
      insee: e.properties.code,
      nom: d?.commune.nom ?? e.properties.nom,
      zone: d?.zone ?? 0,
      d: chemin(e.geometry, d ? TOLERANCE.desservie : TOLERANCE.voisine),
      centre: centre(e.geometry),
    };
  })
  // Communes voisines d'abord, communes desservies par-dessus.
  .sort((a, b) => (a.zone === 0 ? 0 : 1) - (b.zone === 0 ? 0 : 1));

const absentes = [...desservies.keys()].filter((code) => !communes.some((c) => c.insee === code));
if (absentes.length) throw new Error(`Contours introuvables pour : ${absentes.join(", ")}`);

const carte = {
  zone: ZONE_ACTIVE,
  source,
  vue: [-demi, -demi, demi * 2, demi * 2].map(Math.round),
  rayons: { zone1: zone.rayons.zone1 * ECHELLE, zone2: zone.rayons.zone2 * ECHELLE },
  communes,
};
const json = JSON.stringify(carte);
await mkdir("public", { recursive: true });
await writeFile("public/carte-zone.json", json + "\n");
console.log(
  `public/carte-zone.json : ${communes.filter((c) => c.zone).length} communes desservies, ` +
    `${communes.filter((c) => !c.zone).length} voisines, ${Math.round(json.length / 1024)} Ko (${source})`,
);
