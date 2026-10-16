/**
 * Fabrique l'image de repli du héros « pare-brise » à partir de la scène 3D :
 * elle s'affiche en mode dégradé (appareil modeste, WebGL indisponible) et
 * quand l'appareil demande moins de mouvement.
 *
 * Usage, site construit et lancé (npm run build && npm start) :
 *   node scripts/generer-affiche-heros.ts [http://localhost:3000]
 *
 * Chromium : celui de Playwright (npx playwright install chromium), ou un
 * autre indiqué par la variable CHROMIUM_PATH.
 *
 * Sorties : public/heros/pare-brise-large.avif et pare-brise-etroit.avif
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";

const FORMATS = [
  { nom: "large", largeur: 1600, hauteur: 900, echelle: 1, mobile: false },
  { nom: "etroit", largeur: 390, hauteur: 844, echelle: 2, mobile: true },
] as const;

const navigateur = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  // Rendu logiciel accepté : l'image est la même, seulement plus lente à venir.
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

await mkdir("public/heros", { recursive: true });

for (const f of FORMATS) {
  const page = await navigateur.newPage({
    viewport: { width: f.largeur, height: f.hauteur },
    deviceScaleFactor: f.echelle,
    isMobile: f.mobile,
    hasTouch: f.mobile,
  });
  await page.goto(`${base}/?affiche`, { waitUntil: "load" });
  await page.waitForFunction(() => (window as Window & { __affichePrete?: boolean }).__affichePrete === true, null, {
    timeout: 300_000,
    polling: 500,
  });
  const png = await page.evaluate(() => document.querySelector<HTMLCanvasElement>("main section canvas")?.toDataURL("image/png"));
  if (!png) throw new Error(`Canvas introuvable (${f.nom}).`);
  const sortie = `public/heros/pare-brise-${f.nom}.avif`;
  const avif = await sharp(Buffer.from(png.split(",")[1]!, "base64"))
    .avif({ quality: 52, effort: 6 })
    .toBuffer();
  await writeFile(sortie, avif);
  console.log(`${sortie} : ${Math.round(avif.length / 1024)} Ko`);
  await page.close();
}

await navigateur.close();
