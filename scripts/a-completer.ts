/**
 * `npm run a-completer` : ce qui reste à renseigner ou à confirmer avant
 * l'ouverture du site, lu dans la configuration (src/config/site.ts et
 * src/data/legal.ts), avec, pour chaque valeur, où trouver l'information
 * (docs/a-completer.md, qui recense aussi les emplacements écrits dans les
 * textes). Ne modifie rien.
 */
import { readFile } from "node:fs/promises";
import { site } from "../src/config/site.ts";
import { emplacementsCites, ouTrouver, valeursVides } from "./inventaire.ts";

const documentation = await readFile(new URL("../docs/a-completer.md", import.meta.url), "utf8");
// data/legal.ts importe d'autres modules sans extension (Next.js) : lu comme texte.
const legal = await readFile(new URL("../src/data/legal.ts", import.meta.url), "utf8");
const textes = await Promise.all(
  ["cgv", "confidentialite", "mentions-legales"].map((nom) =>
    readFile(new URL(`../src/content/${nom}.mdx`, import.meta.url), "utf8"),
  ),
);

const vides = valeursVides(site, "site");
const aConfirmer = [
  ...(site.annulation.confirmee ? [] : ["site.annulation.confirmee"]),
  ...(/faite:\s*false/.test(legal) ? ["RELECTURE_JURIDIQUE.faite"] : []),
];
const dansLesTextes = textes.flatMap((texte) =>
  [...texte.matchAll(/<(ACompleter|AConfirmer)\b[^>]*libelle="([^"]+)"/g)].map(
    ([, composant, libelle]) => `[À ${composant === "ACompleter" ? "COMPLÉTER" : "CONFIRMER"} : ${libelle}]`,
  ),
);

function ligne(chemin: string): string {
  const ou = ouTrouver(documentation, chemin);
  return `  - ${chemin}\n      ${ou ?? "absent de docs/a-completer.md : à y ajouter"}`;
}

console.log("Allée Nette : ce qui reste avant l'ouverture (détail dans docs/a-completer.md)\n");
console.log(
  vides.length
    ? `${vides.length} valeur(s) vide(s) dans src/config/site.ts :\n${vides.map(ligne).join("\n")}\n`
    : "Toutes les valeurs de src/config/site.ts sont renseignées.\n",
);
if (aConfirmer.length) console.log(`${aConfirmer.length} règle(s) à confirmer :\n${aConfirmer.map(ligne).join("\n")}\n`);
if (dansLesTextes.length) {
  console.log(`${dansLesTextes.length} emplacement(s) écrit(s) dans src/content/*.mdx :`);
  for (const emplacement of dansLesTextes) {
    const liste = emplacementsCites(documentation).includes(emplacement) ? "" : " (absent de docs/a-completer.md)";
    console.log(`  - ${emplacement}${liste}`);
  }
}
