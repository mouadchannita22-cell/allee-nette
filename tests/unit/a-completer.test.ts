import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import { RELECTURE_JURIDIQUE } from "@/data/legal";
import PageMentions from "@/app/mentions-legales/page";
import PageCgv from "@/app/cgv/page";
import PageConfidentialite from "@/app/confidentialite/page";
import { emplacementsCites, ouTrouver, valeursVides } from "../../scripts/inventaire";

/**
 * docs/a-completer.md recense tous les emplacements « [À COMPLÉTER : …] » et
 * « [À CONFIRMER : …] » du site (pour le README de l'étape 10). Ce test
 * échoue si le site en affiche un qui n'y est pas, si une valeur vide de la
 * configuration n'y figure pas, ou si le document cite un emplacement qui
 * n'existe plus.
 */

const RACINE = join(import.meta.dirname, "..", "..");
const DOCUMENTATION = readFileSync(join(RACINE, "docs/a-completer.md"), "utf8");
const CITES = new Set(emplacementsCites(DOCUMENTATION));

const SOURCES = new Map(
  readdirSync(join(RACINE, "src"), { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && /\.(?:ts|tsx|mdx)$/.test(f.name))
    .map((f) => {
      const chemin = relative(RACINE, join(f.parentPath, f.name));
      return [chemin, readFileSync(join(RACINE, chemin), "utf8")] as const;
    }),
);

/** « nom de l'associé ${lettre} » vaut pour A et pour B. */
function developper(libelle: string): string[] {
  return /\$\{[^}]+\}/.test(libelle) ? ["A", "B"].map((l) => libelle.replace(/\$\{[^}]+\}/g, l)) : [libelle];
}

/** Libellés non littéraux connus, et leur valeur. */
const LIBELLES_CALCULES: Record<string, string[]> = {
  // Email (components/legal/Valeurs.tsx) transmet le libellé reçu, écrit en clair là où Email est utilisé.
  "src/components/legal/Valeurs.tsx : libelle": [],
  "src/components/legal/PageLegale.tsx : RELECTURE_JURIDIQUE.libelle": [`[À CONFIRMER : ${RELECTURE_JURIDIQUE.libelle}]`],
};

/** Emplacements que le code peut afficher, relevés dans src (composants, ouACompleter, MDX). */
function emplacementsDuCode(): { emplacements: Map<string, string[]>; inconnus: string[] } {
  const emplacements = new Map<string, string[]>();
  const inconnus: string[] = [];
  const noter = (emplacement: string, fichier: string) =>
    emplacements.set(emplacement, [...(emplacements.get(emplacement) ?? []), fichier]);

  for (const [fichier, texte] of SOURCES) {
    for (const [, composant, attributs] of texte.matchAll(/<(ACompleter|AConfirmer|Email)\b([\s\S]*?)\/>/g)) {
      const type = composant === "AConfirmer" ? "CONFIRMER" : "COMPLÉTER";
      const m = attributs!.match(/libelle=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/);
      if (!m) {
        inconnus.push(`${fichier} : <${composant}> sans libellé`);
      } else if (m[3] !== undefined) {
        const calcule = LIBELLES_CALCULES[`${fichier} : ${m[3].trim()}`];
        if (calcule) calcule.forEach((e) => noter(e, fichier));
        else inconnus.push(`${fichier} : libellé calculé {${m[3]}}`);
      } else {
        for (const libelle of developper(m[1] ?? m[2]!)) noter(`[À ${type} : ${libelle}]`, fichier);
      }
    }

    const appels = [...texte.matchAll(/(?<!function )ouACompleter\(/g)].length;
    const litteraux = [...texte.matchAll(/ouACompleter\(\s*[^,()]+(?:\([^()]*\))?,\s*(?:"([^"]*)"|`([^`]*)`)\s*\)/g)];
    if (appels !== litteraux.length) inconnus.push(`${fichier} : ouACompleter() avec un libellé calculé`);
    for (const m of litteraux) for (const libelle of developper(m[1] ?? m[2]!)) noter(`[À COMPLÉTER : ${libelle}]`, fichier);
  }
  return { emplacements, inconnus };
}

/** Texte rendu d'une page, entités HTML décodées. */
function texteRendu(Page: ComponentType): string {
  return renderToStaticMarkup(createElement(Page))
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

describe("docs/a-completer.md : inventaire des emplacements", () => {
  const { emplacements, inconnus } = emplacementsDuCode();

  it("chaque libellé d'emplacement est lisible dans le code (pas de libellé calculé inconnu)", () => {
    expect(inconnus).toEqual([]);
    expect(emplacements.size).toBeGreaterThan(30);
  });

  it("chaque emplacement que le code peut afficher est listé", () => {
    const absents = [...emplacements]
      .filter(([emplacement]) => !CITES.has(emplacement))
      .map(([emplacement, fichiers]) => `${emplacement} (${[...new Set(fichiers)].join(", ")})`);
    expect(absents, "à ajouter dans docs/a-completer.md").toEqual([]);
  });

  it("chaque emplacement affiché par les pages légales est listé", () => {
    for (const Page of [PageMentions, PageCgv, PageConfidentialite]) {
      const affiches = emplacementsCites(texteRendu(Page));
      expect(affiches.length).toBeGreaterThan(0);
      expect(affiches.filter((e) => !CITES.has(e)), "à ajouter dans docs/a-completer.md").toEqual([]);
    }
  });

  it("le document ne cite aucun emplacement disparu du code", () => {
    const perimes = [...CITES].filter((e) => !e.endsWith(": …]") && !emplacements.has(e));
    expect(perimes, "à retirer de docs/a-completer.md").toEqual([]);
  });

  it("chaque valeur vide de src/config/site.ts a sa ligne, avec où trouver l'information", () => {
    const vides = valeursVides(site, "site");
    expect(vides).toContain("site.associes.A.siren");
    for (const chemin of vides) {
      const ou = ouTrouver(DOCUMENTATION, chemin);
      expect(ou, `${chemin} absent de docs/a-completer.md`).not.toBeNull();
      expect(ou!.length, chemin).toBeGreaterThan(10);
    }
  });

  it("les règles à confirmer de la configuration sont listées", () => {
    if (!site.annulation.confirmee) {
      expect(ouTrouver(DOCUMENTATION, "site.annulation.confirmee")).toMatch(/confirmee/);
      // Mention « [À CONFIRMER] » sans libellé, à côté de la question de la FAQ.
      expect(SOURCES.get("src/components/sections/ListeFaq.tsx")).toContain("[À CONFIRMER]");
      expect(DOCUMENTATION).toContain("`[À CONFIRMER]` à côté de la question « Puis-je annuler ? »");
    }
    if (!RELECTURE_JURIDIQUE.faite) expect(ouTrouver(DOCUMENTATION, "RELECTURE_JURIDIQUE.faite")).toMatch(/faite/);
  });

  it("valeursVides et ouTrouver (fonctions du script npm run a-completer)", () => {
    expect(valeursVides({ a: "", b: { c: " ", d: "x", e: [""] }, f: 0 }, "site")).toEqual(["site.a", "site.b.c"]);
    const doc = "| Valeur | Où |\n| --- | --- |\n| `site.a` | dans le classeur |\n| `site.b` (B) | idem |\n\nTexte";
    expect(ouTrouver(doc, "site.a")).toBe("dans le classeur");
    expect(ouTrouver(doc, "site.b")).toBe("dans le classeur");
    expect(ouTrouver(doc, "site.c")).toBeNull();
    expect(emplacementsCites("x [À COMPLÉTER : a] y [À CONFIRMER : b] [À COMPLÉTER : a] [À CONFIRMER]")).toEqual([
      "[À COMPLÉTER : a]",
      "[À CONFIRMER : b]",
    ]);
  });
});
