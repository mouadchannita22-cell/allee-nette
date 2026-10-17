import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Garde-fou contre la fuite de clés : aucun fichier suivi par git (ni aucun
 * fichier nouveau qui n'est pas ignoré, donc prêt à être ajouté) ne contient
 * une clé Stripe ou un secret de webhook.
 *
 * Les clés vivent uniquement dans .env.local (ignoré) et dans les variables
 * de l'hébergeur. Dans la documentation, les exemples restent tronqués :
 * « sk_test_... ».
 */

const RACINE = fileURLToPath(new URL("../..", import.meta.url));

/** Préfixe d'une clé Stripe ou d'un secret de webhook, suivi d'au moins 10 caractères alphanumériques. */
const MOTIF_CLE = /(?:sk_live_|rk_live_|sk_test_|rk_test_|whsec_)[A-Za-z0-9]{10,}/g;

/** Clés trouvées dans un texte, masquées (on ne recopie jamais une clé dans un journal). */
function clesTrouvees(texte: string): string[] {
  return [...texte.matchAll(MOTIF_CLE)].map((m) => `${m[0].slice(0, m[0].indexOf("_", 3) + 1)}…`);
}

/** Fichiers suivis par git, et fichiers nouveaux non ignorés. `null` hors d'un dépôt git. */
function fichiersDuDepot(): string[] | null {
  try {
    return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: RACINE,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\0")
      .filter(Boolean);
  } catch {
    return null;
  }
}

/** Contenu texte d'un fichier ; `null` s'il est binaire (octet nul au début, comme le fait git) ou supprimé. */
function lireTexte(chemin: string): string | null {
  let contenu: Buffer;
  try {
    contenu = readFileSync(`${RACINE}/${chemin}`);
  } catch {
    return null;
  }
  return contenu.subarray(0, 8000).includes(0) ? null : contenu.toString("utf8");
}

// Exemples construits morceau par morceau : ce fichier ne contient lui-même aucune clé.
const exemple = (prefixe: string, suite: string) => `${prefixe}_${suite}`;

describe("détection des clés", () => {
  it.each([
    exemple("sk_live", "51AbCdEfGhIjKlMn"),
    exemple("rk_live", "0123456789"),
    exemple("sk_test", "51AbCdEfGhIjKlMnOpQr"),
    exemple("rk_test", "abcdefghij"),
    exemple("whsec", "AbCdEf0123456789"),
  ])("repère %s", (cle) => {
    expect(clesTrouvees(`STRIPE_API_KEY_A=${cle}\n`)).toHaveLength(1);
  });

  it.each(["sk_test_...", "sk_test_…", "rk_live_", exemple("sk_live", "123456789"), "whsec_...", "STRIPE_WEBHOOK_SECRET_A="])(
    "ignore les exemples tronqués et les noms de variables (%s)",
    (texte) => {
      expect(clesTrouvees(texte)).toEqual([]);
    },
  );

  it("masque la clé dans le rapport", () => {
    expect(clesTrouvees(exemple("sk_live", "51AbCdEfGhIjKlMn"))).toEqual(["sk_live_…"]);
    expect(clesTrouvees(exemple("whsec", "AbCdEf0123456789"))).toEqual(["whsec_…"]);
  });
});

describe("aucune clé dans le dépôt", () => {
  it("parcourt les fichiers de git ls-files", (contexte) => {
    const fichiers = fichiersDuDepot();
    if (fichiers === null) {
      contexte.skip("git indisponible : vérification impossible ici");
      return;
    }
    expect(fichiers).toContain("package.json");
    expect(fichiers).toContain("tests/unit/fuite-cles.test.ts");

    const fuites: string[] = [];
    for (const fichier of fichiers) {
      const texte = lireTexte(fichier);
      if (texte === null) continue;
      for (const cle of clesTrouvees(texte)) fuites.push(`${fichier} : ${cle}`);
    }
    expect(fuites, "Clé ou secret trouvé : retirez-le, puis révoquez-le dans le tableau de bord Stripe").toEqual([]);
  });
});
