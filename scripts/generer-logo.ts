/**
 * Génère le logotype Allée Nette en tracés SVG : le texte est converti en
 * chemins, le logo s'affiche donc à l'identique partout, sans police installée.
 * L'accent du « é » est remplacé par une goutte.
 *
 * Usage : node scripts/generer-logo.ts
 *
 * Sorties :
 *  - public/logos/allee-nette-clair.svg   (sur fond clair)
 *  - public/logos/allee-nette-sombre.svg  (sur fond sombre)
 *  - public/logos/allee-nette-icone.svg   (icône carrée)
 *  - public/icones/*.png, src/app/icon.svg, src/app/apple-icon.png
 *  - src/components/marque/logo-chemins.ts (tracés pour le composant React)
 *  - assets/polices/*.ttf + licences OFL (réutilisées par l'image Open Graph)
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import opentype from "opentype.js";
import sharp from "sharp";

const COULEURS = {
  nuit: "#0B1220",
  ecume: "#F3FAFC",
  aqua: "#2EE6D6",
  turquoise: "#19C3B1",
  lagon: "#0E7C74",
};

const POLICES = [
  { fichier: "Unbounded-700.ttf", famille: "Unbounded", graisse: 700, ofl: "unbounded" },
  { fichier: "PlusJakartaSans-400.ttf", famille: "Plus Jakarta Sans", graisse: 400, ofl: "plusjakartasans" },
  { fichier: "PlusJakartaSans-700.ttf", famille: "Plus Jakarta Sans", graisse: 700, ofl: "plusjakartasans" },
];

async function telechargerPolices() {
  await mkdir("assets/polices", { recursive: true });
  for (const p of POLICES) {
    const chemin = `assets/polices/${p.fichier}`;
    if (existsSync(chemin)) continue;
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.famille)}:wght@${p.graisse}`)
    ).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error(`Fichier TTF introuvable pour ${p.famille} ${p.graisse}`);
    await writeFile(chemin, Buffer.from(await (await fetch(url)).arrayBuffer()));
    const licence = `assets/polices/OFL-${p.ofl}.txt`;
    if (!existsSync(licence)) {
      const txt = await (await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${p.ofl}/OFL.txt`)).text();
      await writeFile(licence, txt);
    }
  }
}

type Point = [number, number];
const arrondi = (n: number) => Math.round(n * 100) / 100;

type Commande = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };

/**
 * Sérialise un tracé opentype.js. `Path.toPathData()` de la version 2.0.0
 * produit des « NaN » à l'arrondi de certaines coordonnées : on s'en passe.
 */
function versD(commandes: Commande[]): string {
  const n = (v: number | undefined) => {
    if (v === undefined || !Number.isFinite(v)) throw new Error("Coordonnée invalide dans le tracé");
    return String(arrondi(v));
  };
  return commandes
    .map((c) => {
      switch (c.type) {
        case "M":
        case "L":
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case "Q":
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case "C":
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        case "Z":
          return "Z";
        default:
          throw new Error(`Commande de tracé inconnue : ${c.type}`);
      }
    })
    .join("");
}

/** Goutte pointe en haut, centre du cercle en (0, 0), rayon r, inclinée de `angle` degrés. */
function cheminGoutte(cx: number, cy: number, r: number, angle: number): string {
  const t = (angle * Math.PI) / 180;
  const k = 0.5523;
  const p = ([x, y]: Point): string => {
    const xr = x * Math.cos(t) - y * Math.sin(t) + cx;
    const yr = x * Math.sin(t) + y * Math.cos(t) + cy;
    return `${arrondi(xr)} ${arrondi(yr)}`;
  };
  const pointe: Point = [0, -2.35 * r];
  return [
    `M${p(pointe)}`,
    `C${p([0.18 * r, -1.85 * r])} ${p([r, -1.05 * r])} ${p([r, 0])}`,
    `C${p([r, k * r])} ${p([k * r, r])} ${p([0, r])}`,
    `C${p([-k * r, r])} ${p([-r, k * r])} ${p([-r, 0])}`,
    `C${p([-r, -1.05 * r])} ${p([-0.18 * r, -1.85 * r])} ${p(pointe)}`,
    "Z",
  ].join("");
}

/** Reflet en croissant à l'intérieur de la goutte (pour l'icône). */
function cheminReflet(cx: number, cy: number, r: number, angle: number): string {
  const t = (angle * Math.PI) / 180;
  const p = ([x, y]: Point): string =>
    `${arrondi(x * Math.cos(t) - y * Math.sin(t) + cx)} ${arrondi(x * Math.sin(t) + y * Math.cos(t) + cy)}`;
  return [
    `M${p([-0.62 * r, -0.05 * r])}`,
    `C${p([-0.62 * r, -0.55 * r])} ${p([-0.35 * r, -1.05 * r])} ${p([-0.12 * r, -1.4 * r])}`,
    `C${p([-0.3 * r, -0.9 * r])} ${p([-0.4 * r, -0.45 * r])} ${p([-0.36 * r, 0.05 * r])}`,
    `C${p([-0.4 * r, 0.25 * r])} ${p([-0.62 * r, 0.2 * r])} ${p([-0.62 * r, -0.05 * r])}`,
    "Z",
  ].join("");
}

const INCLINAISON = 28;

async function main() {
  await telechargerPolices();
  const police = opentype.parse((await readFile("assets/polices/Unbounded-700.ttf")).buffer);
  const F = 100;
  const echelle = F / police.unitsPerEm;
  const ligneDeBase = police.ascender * echelle;
  const hauteurX = (police.tables.os2?.sxHeight ?? police.unitsPerEm * 0.55) * echelle;

  // Texte sans accent : la goutte remplace l'accent aigu du « é ».
  const texte = "Allee Nette";
  const cheminTexte = police.getPath(texte, 0, ligneDeBase, F, { kerning: true });

  // Position du « e » accentué (4e lettre).
  const glyphes = police.stringToGlyphs(texte);
  let x = 0;
  for (let i = 0; i < 3; i++) {
    const g = glyphes[i]!;
    x += (g.advanceWidth ?? 0) * echelle;
    x += police.getKerningValue(g, glyphes[i + 1]!) * echelle;
  }
  const boiteE = glyphes[3]!.getBoundingBox();
  const centreE = x + ((boiteE.x1 + boiteE.x2) / 2) * echelle;

  const r = 0.088 * F;
  const goutte = cheminGoutte(centreE + 0.04 * F, ligneDeBase - hauteurX - 0.09 * F - r, r, INCLINAISON);

  const bt = cheminTexte.getBoundingBox();
  const haut = Math.min(bt.y1, ligneDeBase - hauteurX - 0.09 * F - 3.1 * r);
  const marge = 0.04 * F;
  const vb = {
    x: arrondi(bt.x1 - marge),
    y: arrondi(haut - marge),
    l: arrondi(bt.x2 - bt.x1 + 2 * marge),
    h: arrondi(bt.y2 - haut + 2 * marge),
  };
  const viewBox = `${vb.x} ${vb.y} ${vb.l} ${vb.h}`;
  const dTexte = versD(cheminTexte.commands);

  const logo = (couleurTexte: string, degrade: [string, string], titre: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="t">
  <title id="t">${titre}</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${degrade[0]}"/>
      <stop offset="1" stop-color="${degrade[1]}"/>
    </linearGradient>
  </defs>
  <path fill="${couleurTexte}" d="${dTexte}"/>
  <path fill="url(#g)" d="${goutte}"/>
</svg>
`;

  await mkdir("public/logos", { recursive: true });
  await writeFile("public/logos/allee-nette-clair.svg", logo(COULEURS.nuit, [COULEURS.turquoise, COULEURS.lagon], "Allée Nette"));
  await writeFile("public/logos/allee-nette-sombre.svg", logo(COULEURS.ecume, [COULEURS.aqua, COULEURS.turquoise], "Allée Nette"));

  // Icône carrée : le « é » du logotype, blanc sur fond nuit, goutte aqua.
  const T = 512;
  const FI = 430;
  const echelleI = FI / police.unitsPerEm;
  const gE = police.charToGlyph("e");
  const bE = gE.getBoundingBox();
  const largeurE = (bE.x2 - bE.x1) * echelleI;
  const hauteurE = (bE.y2 - bE.y1) * echelleI;
  const rI = 0.072 * FI * 1.25;
  const ecart = 0.06 * FI;
  // La pointe de la goutte inclinée monte d'environ 2,07 r au-dessus du centre du cercle.
  const hauteurTotale = hauteurE + ecart + 3.07 * rI;
  const hautE = (T - hauteurTotale) / 2 + ecart + 3.07 * rI;
  const baseI = hautE + bE.y2 * echelleI;
  const xI = (T - largeurE) / 2 - bE.x1 * echelleI;
  const cheminE = versD(gE.getPath(xI, baseI, FI).commands);
  const cxG = T / 2 + 0.03 * FI;
  const cyG = hautE - ecart - rI;
  const icone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" role="img" aria-labelledby="t">
  <title id="t">Allée Nette</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${COULEURS.aqua}"/>
      <stop offset="1" stop-color="${COULEURS.turquoise}"/>
    </linearGradient>
  </defs>
  <rect width="${T}" height="${T}" rx="${T * 0.22}" fill="${COULEURS.nuit}"/>
  <path fill="${COULEURS.ecume}" d="${cheminE}"/>
  <path fill="url(#g)" d="${cheminGoutte(cxG, cyG, rI, INCLINAISON)}"/>
  <path fill="#FFFFFF" fill-opacity=".55" d="${cheminReflet(cxG, cyG, rI, INCLINAISON)}"/>
</svg>
`;
  await writeFile("public/logos/allee-nette-icone.svg", icone);
  await mkdir("src/app", { recursive: true });
  await writeFile("src/app/icon.svg", icone);

  // Variante « maskable » : fond plein, motif réduit dans la zone de sécurité.
  const maskable = icone
    .replace(`rx="${T * 0.22}"`, 'rx="0"')
    .replace("<path ",`<g transform="translate(${T * 0.1} ${T * 0.1}) scale(0.8)"><path `)
    .replace("</svg>", "</g></svg>");

  await mkdir("public/icones", { recursive: true });
  const png = (svg: string, taille: number, sortie: string) =>
    sharp(Buffer.from(svg), { density: 300 }).resize(taille, taille).png({ compressionLevel: 9 }).toFile(sortie);
  await png(icone, 192, "public/icones/icone-192.png");
  await png(icone, 512, "public/icones/icone-512.png");
  await png(maskable, 512, "public/icones/icone-maskable-512.png");
  await png(icone, 180, "src/app/apple-icon.png");

  // Aperçus pour vérification visuelle.
  await mkdir("assets/apercus", { recursive: true });
  await sharp(Buffer.from(logo(COULEURS.nuit, [COULEURS.turquoise, COULEURS.lagon], "Allée Nette")), { density: 600 })
    .resize({ width: 1200 })
    .flatten({ background: COULEURS.ecume })
    .png()
    .toFile("assets/apercus/logo-clair.png");
  await sharp(Buffer.from(logo(COULEURS.ecume, [COULEURS.aqua, COULEURS.turquoise], "Allée Nette")), { density: 600 })
    .resize({ width: 1200 })
    .flatten({ background: COULEURS.nuit })
    .png()
    .toFile("assets/apercus/logo-sombre.png");

  // Tracés pour le composant React (couleur du texte héritée via currentColor).
  await mkdir("src/components/marque", { recursive: true });
  await writeFile(
    "src/components/marque/logo-chemins.ts",
    `// Fichier généré par scripts/generer-logo.ts : ne pas modifier à la main.
export const LOGO_VIEWBOX = "${viewBox}";
export const LOGO_TEXTE = "${dTexte}";
export const LOGO_GOUTTE = "${goutte}";
`,
  );

  console.log("Logo généré :", viewBox);
}

await main();
