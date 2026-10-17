import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { liensLegaux } from "@/config/navigation";
import { ANNEXE_CGV, ARTICLES_CGV } from "@/data/legal";
import { signerLien } from "@/lib/paiement";
import { SECRET_LIENS_E2E } from "./environnement";

/**
 * Pages légales : /mentions-legales, /cgv, /confidentialite, et les liens qui
 * y mènent (pied de page, page de paiement).
 * Projets « mobile » (375 × 812, tactile) et « ordinateur » (1280 × 800).
 */

const PAGES = [
  { chemin: "/mentions-legales", titre: "Mentions légales" },
  { chemin: "/cgv", titre: "Conditions générales de vente" },
  { chemin: "/confidentialite", titre: "Politique de confidentialité" },
] as const;

/** Analyse axe-core (même contournement de types que reservation.spec.ts). */
function axe(page: Page) {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

async function sansViolationGrave(page: Page) {
  const { violations } = await axe(page).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const graves = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(graves.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** Aucun débordement horizontal (mobile d'abord, 375 px). */
async function sansDebordement(page: Page) {
  const { large, ecran } = await page.evaluate(() => ({
    large: document.documentElement.scrollWidth,
    ecran: window.innerWidth,
  }));
  expect(large, "débordement horizontal").toBeLessThanOrEqual(ecran);
}

for (const { chemin, titre } of PAGES) {
  test.describe(chemin, () => {
    test("répond, un seul h1, aucun débordement, aucun cookie", async ({ page, context }) => {
      const reponse = await page.goto(chemin);
      expect(reponse?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: titre })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(`^${titre}`));
      await sansDebordement(page);
      expect(await context.cookies()).toEqual([]);
    });

    test("accessibilité (axe-core) : aucune violation critique ou sérieuse", async ({ page }) => {
      await page.goto(chemin);
      await expect(page.getByRole("heading", { level: 1, name: titre })).toBeVisible();
      await sansViolationGrave(page);
    });
  });
}

test.describe("/cgv : sommaire et annexe", () => {
  test("chaque lien du sommaire mène à son article", async ({ page }) => {
    await page.goto("/cgv");
    const sommaire = page.getByRole("navigation", { name: "Sommaire" });
    const cibles = [...ARTICLES_CGV.map((a) => a.id), ANNEXE_CGV.id];
    await expect(sommaire.getByRole("link")).toHaveCount(cibles.length);

    for (const [i, id] of cibles.entries()) {
      await sommaire.getByRole("link").nth(i).click();
      await expect(page).toHaveURL(new RegExp(`/cgv#${id}$`));
      const titre = page.locator(`h2#${id}`);
      await expect(titre).toBeInViewport();
      if (i < ARTICLES_CGV.length) await expect(titre).toContainText(`Article ${i + 1}`);
      // Retour au sommaire, comme un lecteur.
      await sommaire.scrollIntoViewIfNeeded();
    }
  });

  test("le formulaire type de rétractation est en annexe", async ({ page }) => {
    await page.goto(`/cgv#${ANNEXE_CGV.id}`);
    await expect(page.locator(`h2#${ANNEXE_CGV.id}`)).toBeInViewport();
    const formulaire = page.getByRole("region", { name: "Formulaire de rétractation" });
    await expect(formulaire).toBeVisible();
    await expect(formulaire).toContainText("Je/nous (*) vous notifie/notifions (*) par la présente");
    await expect(formulaire).toContainText("Commandé le");
    await expect(formulaire).toContainText("(*) Rayez la mention inutile.");
    // Un destinataire par associé : nom, adresse et e-mail (ou leurs emplacements).
    await expect(formulaire.getByRole("listitem")).toHaveCount(2);
    await sansDebordement(page);
  });

  test("l'article sur la rétractation cite la case de la réservation et renvoie à l'annexe", async ({ page }) => {
    await page.goto("/cgv#droit-de-retractation");
    const article = page.locator("article");
    await expect(article.locator("blockquote").filter({ hasText: "Je demande que la prestation soit réalisée" })).toBeVisible();
    await article.getByRole("link", { name: "formulaire type de rétractation" }).click();
    await expect(page).toHaveURL(new RegExp(`#${ANNEXE_CGV.id}$`));
    await expect(page.locator(`h2#${ANNEXE_CGV.id}`)).toBeInViewport();
  });
});

test.describe("liens vers les pages légales", () => {
  test("le pied de page mène aux trois pages", async ({ page }) => {
    await page.goto("/");
    const pied = page.getByRole("contentinfo");
    for (const lien of liensLegaux) {
      const element = pied.getByRole("link", { name: lien.libelle, exact: true });
      await expect(element).toHaveAttribute("href", lien.href);
      expect((await page.request.get(lien.href)).status(), lien.href).toBe(200);
    }
  });

  test("la page de paiement renvoie vers l'article Paiement des CGV", async ({ page }) => {
    const lien = { ref: "AN-2026-0142", montant: "119.50", libelle: "Le Complet M", encaisseur: "A" } as const;
    await page.goto(signerLien(lien, new Date(), SECRET_LIENS_E2E));
    await expect(page.getByRole("heading", { name: "Votre prestation", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute(
      "href",
      "/confidentialite#paiement-en-ligne",
    );
    await page.getByRole("link", { name: "conditions générales de vente" }).click();
    await expect(page).toHaveURL(/\/cgv#paiement$/);
    await expect(page.locator("h2#paiement")).toBeInViewport();
  });

  test("la politique de confidentialité a l'ancre visée par la page de paiement", async ({ page }) => {
    await page.goto("/confidentialite#paiement-en-ligne");
    await expect(page.getByRole("heading", { level: 3, name: "Paiement en ligne" })).toBeInViewport();
  });
});
