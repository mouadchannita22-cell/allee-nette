import * as THREE from "three";

/**
 * Voiture générique construite en code : aucun modèle 3D à télécharger,
 * aucune marque, aucune licence à vérifier. La silhouette se règle par
 * gabarit (citadine, berline, grand SUV) ; toutes les cotes sont en mètres.
 *
 * Repère : l'avant pointe vers +x, le toit vers +y, le sol est à y = 0.
 */
export type ProfilVoiture = {
  longueur: number;
  largeur: number;
  /** Hauteur du toit. */
  hauteur: number;
  /** Hauteur de la ligne de caisse (bas des vitres). */
  ceinture: number;
  /** Garde au sol (bas de caisse). */
  garde: number;
  empattement: number;
  rayonRoue: number;
  /** Longueur du capot, depuis le nez jusqu'au pied du pare-brise. */
  capot: number;
  /** Longueur du pare-brise vu de profil. */
  parebrise: number;
  /** Position du haut de la lunette arrière, depuis l'arrière. */
  pavillonArriere: number;
  /** Position du bas de la lunette arrière, depuis l'arrière (coffre de berline : plus grand). */
  lunette: number;
};

export const PROFILS: Record<"S" | "M" | "L", ProfilVoiture> = {
  S: {
    longueur: 3.95,
    largeur: 1.74,
    hauteur: 1.46,
    ceinture: 0.9,
    garde: 0.16,
    empattement: 2.52,
    rayonRoue: 0.34,
    capot: 0.82,
    parebrise: 0.72,
    pavillonArriere: 0.42,
    lunette: 0.1,
  },
  M: {
    longueur: 4.45,
    largeur: 1.8,
    hauteur: 1.42,
    ceinture: 0.88,
    garde: 0.15,
    empattement: 2.68,
    rayonRoue: 0.36,
    capot: 1.05,
    parebrise: 0.8,
    pavillonArriere: 1.02,
    lunette: 0.5,
  },
  L: {
    longueur: 4.8,
    largeur: 1.92,
    hauteur: 1.72,
    ceinture: 1.08,
    garde: 0.22,
    empattement: 2.86,
    rayonRoue: 0.41,
    capot: 1.02,
    parebrise: 0.68,
    pavillonArriere: 0.26,
    lunette: 0.08,
  },
};

const CHANFREIN = { bevelEnabled: true, bevelSegments: 4, curveSegments: 24 } as const;

/** Points d'une courbe quadratique, pour suivre le pavillon avec le toit. */
function quadratique(a: THREE.Vector2, c: THREE.Vector2, b: THREE.Vector2, n: number) {
  return new THREE.QuadraticBezierCurve(a, c, b).getPoints(n);
}

/** Extrusion centrée sur la largeur (axe z). */
function extruder(forme: THREE.Shape, largeur: number, arrondi: number) {
  const g = new THREE.ExtrudeGeometry(forme, {
    ...CHANFREIN,
    depth: largeur - 2 * arrondi,
    bevelSize: arrondi,
    bevelThickness: arrondi,
  });
  g.translate(0, 0, -(largeur - 2 * arrondi) / 2);
  g.computeVertexNormals();
  return g;
}

export type PiecesVoiture = {
  caisse: THREE.BufferGeometry;
  /** Bas de caisse sombre entre les roues : il allège visuellement le flanc. */
  basDeCaisse: THREE.BufferGeometry;
  vitrage: THREE.BufferGeometry;
  toit: THREE.BufferGeometry;
  phares: THREE.BufferGeometry;
  feux: THREE.BufferGeometry;
  pneu: THREE.BufferGeometry;
  jante: THREE.BufferGeometry;
  /** Centres des quatre roues. */
  roues: THREE.Vector3[];
};

export function construireVoiture(p: ProfilVoiture): PiecesVoiture {
  const L = p.longueur / 2;
  const yb = p.garde;
  const yc = p.ceinture;
  const R = p.rayonRoue;
  // Le chanfrein de la caisse (9 cm) grossit la silhouette et referme les passages de roue.
  const arche = R + 0.15;
  // Empattement légèrement décalé vers l'arrière : porte-à-faux avant plus long.
  const xAvant = p.empattement / 2 + 0.06;
  const xArriere = -p.empattement / 2 + 0.06;

  // Pied du pare-brise, haut du pare-brise, haut et bas de la lunette.
  const piedPB = new THREE.Vector2(L - p.capot, yc + 0.05);
  const hautPB = new THREE.Vector2(piedPB.x - p.parebrise, p.hauteur);
  const hautLunette = new THREE.Vector2(-L + p.pavillonArriere, p.hauteur - 0.04);
  const basLunette = new THREE.Vector2(-L + p.lunette + 0.04, yc + 0.06);

  // --- Caisse : tout ce qui est sous la ligne de vitrage --------------------
  const caisse = new THREE.Shape();
  caisse.moveTo(L - 0.12, yb);
  caisse.quadraticCurveTo(L + 0.02, yb, L, yb + 0.3); // bouclier avant
  caisse.quadraticCurveTo(L + 0.01, yc - 0.1, L - 0.14, yc - 0.04); // nez
  caisse.quadraticCurveTo((L + piedPB.x) / 2, yc + 0.03, piedPB.x, piedPB.y); // capot
  caisse.lineTo(basLunette.x, basLunette.y); // ligne de caisse
  caisse.quadraticCurveTo(-L + 0.02, yc + 0.02, -L, yc - 0.12); // haut du hayon
  caisse.quadraticCurveTo(-L - 0.02, yb + 0.12, -L + 0.12, yb); // bouclier arrière

  // Bas de caisse avec les passages de roue, de l'arrière vers l'avant.
  const a = Math.asin(Math.min(0.99, (R - yb) / arche));
  for (const xr of [xArriere, xAvant]) {
    caisse.lineTo(xr - arche * Math.cos(a), yb);
    caisse.absarc(xr, R, arche, Math.PI + a, -a, true);
  }
  caisse.lineTo(L - 0.12, yb);

  // --- Vitrage : pare-brise, vitres latérales, lunette ------------------------
  const sommet = new THREE.Vector2((hautPB.x + hautLunette.x) / 2, p.hauteur + 0.035);
  const vitrage = new THREE.Shape();
  vitrage.moveTo(piedPB.x, piedPB.y - 0.02);
  vitrage.quadraticCurveTo(piedPB.x - p.parebrise * 0.35, (piedPB.y + hautPB.y) / 2 + 0.08, hautPB.x, hautPB.y);
  vitrage.quadraticCurveTo(sommet.x, sommet.y, hautLunette.x, hautLunette.y);
  vitrage.quadraticCurveTo(
    (hautLunette.x + basLunette.x) / 2 - 0.06,
    (hautLunette.y + basLunette.y) / 2 + 0.06,
    basLunette.x,
    basLunette.y - 0.02,
  );
  vitrage.lineTo(piedPB.x, piedPB.y - 0.02);

  // --- Pavillon : une coque peinte qui suit le haut du vitrage ----------------
  const ligneToit = quadratique(
    new THREE.Vector2(hautPB.x + 0.05, hautPB.y - 0.01),
    new THREE.Vector2(sommet.x, sommet.y),
    new THREE.Vector2(hautLunette.x - 0.05, hautLunette.y - 0.01),
    16,
  );
  const toit = new THREE.Shape();
  ligneToit.forEach((pt, i) => (i === 0 ? toit.moveTo(pt.x, pt.y + 0.035) : toit.lineTo(pt.x, pt.y + 0.035)));
  [...ligneToit].reverse().forEach((pt) => toit.lineTo(pt.x, pt.y - 0.03));

  const geoCaisse = extruder(caisse, p.largeur, 0.09);

  const bas = new THREE.Shape();
  const debutBas = xArriere + arche * 0.82;
  const finBas = xAvant - arche * 0.82;
  bas.moveTo(debutBas, yb - 0.06);
  bas.lineTo(finBas, yb - 0.06);
  bas.lineTo(finBas, yb + 0.1);
  bas.lineTo(debutBas, yb + 0.1);
  bas.lineTo(debutBas, yb - 0.06);
  const geoBas = extruder(bas, p.largeur + 0.03, 0.03);
  const geoVitrage = extruder(vitrage, p.largeur * 0.84, 0.07);
  const geoToit = extruder(toit, p.largeur * 0.8, 0.03);

  // --- Optiques : une barre lumineuse sur toute la largeur, à l'avant et à l'arrière.
  // Posées à fleur de la carrosserie, chanfrein compris (9 cm).
  const barre = (x: number, y: number, angle: number, largeur: number, hauteur: number) => {
    const g = new THREE.BoxGeometry(0.05, hauteur, largeur);
    g.rotateZ(angle);
    g.translate(x, y, 0);
    return g;
  };
  const phares = fusionner([barre(L + 0.07, yc - 0.12, -0.42, p.largeur * 0.8, 0.05)]);
  const feux = fusionner([barre(-L - 0.075, yc - 0.17, 0.12, p.largeur * 0.84, 0.06)]);

  // --- Roues --------------------------------------------------------------------
  const pneu = new THREE.CylinderGeometry(R, R, 0.24, 40, 1);
  pneu.rotateX(Math.PI / 2);
  const jante = new THREE.CylinderGeometry(R * 0.66, R * 0.66, 0.245, 28, 1);
  jante.rotateX(Math.PI / 2);
  const zRoue = p.largeur / 2 - 0.15;
  const roues = [xAvant, xArriere].flatMap((x) => [new THREE.Vector3(x, R, zRoue), new THREE.Vector3(x, R, -zRoue)]);

  return { caisse: geoCaisse, basDeCaisse: geoBas, vitrage: geoVitrage, toit: geoToit, phares, feux, pneu, jante, roues };
}

/** Fusionne des géométries non indexées de même structure (optiques). */
function fusionner(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parties = geometries.map((g) => g.toNonIndexed());
  const total = parties.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const position = new Float32Array(total * 3);
  const normale = new Float32Array(total * 3);
  let decalage = 0;
  for (const g of parties) {
    position.set(g.getAttribute("position").array as Float32Array, decalage * 3);
    normale.set(g.getAttribute("normal").array as Float32Array, decalage * 3);
    decalage += g.getAttribute("position").count;
    g.dispose();
  }
  geometries.forEach((g) => g.dispose());
  const resultat = new THREE.BufferGeometry();
  resultat.setAttribute("position", new THREE.BufferAttribute(position, 3));
  resultat.setAttribute("normal", new THREE.BufferAttribute(normale, 3));
  return resultat;
}
