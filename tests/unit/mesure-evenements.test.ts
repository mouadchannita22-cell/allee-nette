import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Événements de la partie 14 du brief : chacun est branché, une seule fois,
 * au bon endroit. Les clics vers le téléphone et WhatsApp passent par une
 * seule écoute (ScriptUmami), qui reconnaît tous les liens du site.
 */

vi.mock("@/config/site", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/config/site")>();
  return { ...original, site: { ...original.site, telephone: "06 12 34 56 78", whatsapp: "33612345678" } };
});

const { evenementDuLien } = await import("@/lib/analytics");
const { lienEmail, lienTelephone, lienWhatsApp, lienWhatsAppPhotos } = await import("@/lib/contact");

const RACINE = join(import.meta.dirname, "..", "..");

function fichiers(dossier: string): string[] {
  return readdirSync(join(RACINE, dossier), { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && /\.(?:ts|tsx|mdx)$/.test(f.name))
    .map((f) => relative(RACINE, join(f.parentPath, f.name)));
}

const SOURCES = new Map(fichiers("src").map((f) => [f, readFileSync(join(RACINE, f), "utf8")]));

/** Fichiers qui émettent un événement donné (suivre ou suivreUneFois). */
function emetteurs(motif: RegExp): string[] {
  return [...SOURCES].filter(([, texte]) => motif.test(texte)).map(([f]) => f);
}

describe("événements de la partie 14", () => {
  it("calculateur_utilise : calculateur de prix et vérificateur de commune, une fois par visite", () => {
    expect(emetteurs(/suivreUneFois\("calculateur_utilise"/).sort()).toEqual([
      "src/components/tarifs/Calculateur.tsx",
      "src/components/tarifs/VerificateurCommune.tsx",
    ]);
    expect(emetteurs(/suivre\("calculateur_utilise"/)).toEqual([]);
  });

  it("reservation_etape_n et demande_envoyee : formulaire de réservation", () => {
    expect(emetteurs(/suivre\(`reservation_etape_\$\{etape\}`\)/)).toEqual([
      "src/components/reservation/FormulaireReservation.tsx",
    ]);
    expect(emetteurs(/suivre\("demande_envoyee"\)/)).toEqual(["src/components/reservation/FormulaireReservation.tsx"]);
  });

  it("paiement_initie (Stripe et PayPal) et paiement_reussi", () => {
    expect(emetteurs(/suivre\("paiement_initie", \{ moyen: "stripe" \}\)/)).toEqual([
      "src/components/paiement/BoutonPayer.tsx",
    ]);
    expect(emetteurs(/suivre\("paiement_initie", \{ moyen: "paypal" \}\)/)).toEqual([
      "src/components/paiement/PaiementPayPal.tsx",
    ]);
    expect(emetteurs(/suivre\("paiement_reussi"/)).toEqual(["src/components/paiement/MesurePaiementReussi.tsx"]);
  });

  it("clic_telephone et clic_whatsapp : une seule écoute pour tout le site, aucun envoi en double", () => {
    expect(emetteurs(/suivre(?:UneFois)?\(\s*["'`]clic_/)).toEqual([]);
    expect(emetteurs(/evenementDuLien\(/).sort()).toEqual([
      "src/components/layout/ScriptUmami.tsx",
      "src/lib/analytics.ts",
    ]);
    expect(SOURCES.get("src/app/layout.tsx")).toContain("<MesureAudience />");
  });

  it("tous les liens de contact du site sont reconnus", () => {
    expect(evenementDuLien(lienTelephone())).toBe("clic_telephone");
    expect(evenementDuLien(lienWhatsApp())).toBe("clic_whatsapp");
    expect(evenementDuLien(lienWhatsApp("Bonjour Allée Nette !"))).toBe("clic_whatsapp");
    expect(evenementDuLien(lienWhatsAppPhotos("AN-2026-0042"))).toBe("clic_whatsapp");
    expect(evenementDuLien(lienEmail())).toBeNull();
  });

  it("chaque lien tel: ou WhatsApp écrit dans le code passe par lib/contact (donc reconnu)", () => {
    const enDur = [...SOURCES]
      .filter(([f]) => f !== "src/lib/analytics.ts")
      .flatMap(([f, texte]) =>
        [...texte.matchAll(/href=["'{`]+(tel:|https?:\/\/(?:wa\.me|[\w.]*whatsapp\.com))/g)].map((m) => `${f} : ${m[1]}`),
      );
    expect(enDur).toEqual([]);
  });

  it("aucune donnée personnelle : seules les données typées moyen et outil accompagnent un événement", () => {
    const donnees = [...SOURCES].flatMap(([f, texte]) =>
      [...texte.matchAll(/suivre(?:UneFois)?\([^,)]+,\s*(\{[^}]*\})/g)].map((m) => `${f} : ${m[1]}`),
    );
    for (const ligne of donnees) expect(ligne).toMatch(/\{ (?:moyen|outil)(?:: "[a-z]+")? \}$/);
    expect(donnees.length).toBeGreaterThanOrEqual(4);
  });
});
