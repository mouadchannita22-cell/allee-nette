import { expect, test, type Page } from "@playwright/test";
import { signerLien } from "@/lib/paiement";
import { NOM_FILTRE_UMAMI, SRC_UMAMI_PAR_DEFAUT } from "@/lib/umami";
import { SECRET_LIENS_E2E } from "./environnement";

/**
 * Mesure d'audience sans cookie (partie 14 du brief) et absence de traceurs.
 * Projets « mobile » (375 × 812, tactile) et « ordinateur » (1280 × 800).
 *
 * Le script Umami n'existe dans le site que si NEXT_PUBLIC_UMAMI_WEBSITE_ID
 * est défini au build. Pour vérifier son chargement, construire et tester avec
 * la même valeur factice :
 *   NEXT_PUBLIC_UMAMI_WEBSITE_ID=e2e-umami npm run build
 *   NEXT_PUBLIC_UMAMI_WEBSITE_ID=e2e-umami npx playwright test tests/e2e/mesure.spec.ts
 * La requête vers Umami est toujours interceptée : rien ne part réellement.
 */

const ID_UMAMI = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? "";
const SRC_UMAMI = process.env.NEXT_PUBLIC_UMAMI_SRC?.trim() || SRC_UMAMI_PAR_DEFAUT;
const HOTE_UMAMI = new URL(SRC_UMAMI, "http://localhost").hostname;
const DOMAINE_SITE = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").hostname;

const LIEN_PAIEMENT = { ref: "AN-2026-0142", montant: "119.50", libelle: "Le Complet M", encaisseur: "A" } as const;

/** Les trois pages du parcours : accueil, réservation, paiement (sans clic PayPal). */
const PAGES = [
  { nom: "l'accueil", chemin: () => "/" },
  { nom: "/reserver", chemin: () => "/reserver?utm_source=affiche&code=GARAGE" },
  { nom: "/paiement", chemin: () => signerLien(LIEN_PAIEMENT, new Date(), SECRET_LIENS_E2E) },
] as const;

/** Faux Umami installé avant le code du site : chaque événement est noté. */
async function espionnerUmami(page: Page): Promise<{ nom: string; donnees?: unknown }[]> {
  const evenements: { nom: string; donnees?: unknown }[] = [];
  await page.exposeFunction("__mesure", (nom: string, donnees?: unknown) => {
    evenements.push({ nom, donnees });
  });
  await page.addInitScript(() => {
    const w = window as unknown as { umami: unknown; __mesure: (nom: string, donnees?: unknown) => void };
    w.umami = { track: (nom: string, donnees?: unknown) => w.__mesure(nom, donnees) };
  });
  return evenements;
}

/** Hôtes tiers demandés par la page (hors Umami, intercepté). */
function noterRequetesTierces(page: Page): string[] {
  const hotes: string[] = [];
  page.on("request", (r) => {
    const { hostname, protocol } = new URL(r.url());
    if (protocol === "data:" || protocol === "blob:") return;
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== HOTE_UMAMI) hotes.push(hostname);
  });
  return hotes;
}

test.describe("aucun cookie, aucun traceur tiers", () => {
  for (const { nom, chemin } of PAGES) {
    test(`${nom} : aucun cookie déposé`, async ({ page, context }) => {
      // Umami, s'il est configuré, n'est jamais joint pour de vrai.
      await page.route(`https://${HOTE_UMAMI}/**`, (route) => route.abort());
      const tiers = noterRequetesTierces(page);
      const reponse = await page.goto(chemin());
      expect(reponse?.status()).toBe(200);
      await page.waitForLoadState("load");
      await page.waitForTimeout(1_500);
      expect(await context.cookies()).toEqual([]);
      expect(await page.evaluate(() => document.cookie)).toBe("");
      expect(tiers, "requêtes vers un site tiers").toEqual([]);
    });
  }
});

test.describe("événements", () => {
  test("calculateur_utilise : une seule fois, même après plusieurs interactions", async ({ page }) => {
    const evenements = await espionnerUmami(page);
    await page.goto("/tarifs");
    const calculateur = page.getByRole("form", { name: "Calculateur de prix" });
    // Cartes cliquables autour des boutons radio masqués : on clique la carte, comme un visiteur.
    const formules = calculateur.getByRole("group", { name: "Formule" }).locator("label");
    await formules.nth(0).click();
    await formules.nth(1).click();
    await expect(calculateur.getByRole("group", { name: "Formule" }).getByRole("radio").nth(1)).toBeChecked();
    await calculateur.getByRole("combobox", { name: "Votre commune" }).fill("Sain");
    await expect.poll(() => evenements.filter((e) => e.nom === "calculateur_utilise").length).toBe(1);
    await page.waitForTimeout(500);
    expect(evenements.filter((e) => e.nom === "calculateur_utilise")).toEqual([
      { nom: "calculateur_utilise", donnees: { outil: "calculateur" } },
    ]);
  });
});

test.describe("provenance des visites", () => {
  test("QR code du garage : /garage ouvre la réservation avec le code GARAGE et la source", async ({ page, request }) => {
    const redirection = await request.get("/garage", { maxRedirects: 0 });
    expect(redirection.status()).toBe(307);
    expect(redirection.headers().location).toBe("/reserver?code=GARAGE&utm_source=garage&utm_medium=qr");
    await page.goto("/garage");
    await expect(page).toHaveURL(/\/reserver\?code=GARAGE&utm_source=garage&utm_medium=qr$/);
    // Le code est appliqué à l'estimation ; la source part avec la demande (voir reservation.spec.ts).
    await expect(page.getByText(/code GARAGE/i).first()).toBeAttached();
  });
});

test.describe("script Umami", () => {
  test.skip(!ID_UMAMI, "NEXT_PUBLIC_UMAMI_WEBSITE_ID non défini : le site est construit sans mesure d'audience");

  /**
   * Intercepte toute requête vers Umami : le script est remplacé par un faux
   * qui note les événements, les envois sont bloqués.
   */
  async function intercepterUmami(page: Page) {
    const demandesScript: number[] = [];
    const envois: string[] = [];
    await page.route(`https://${HOTE_UMAMI}/**`, async (route) => {
      if (route.request().url() === SRC_UMAMI) {
        demandesScript.push(Date.now());
        await route.fulfill({
          contentType: "text/javascript",
          body: "window.__umami = []; window.umami = { track: function (n, d) { window.__umami.push([n, d || null]); } };",
        });
      } else {
        envois.push(route.request().url());
        await route.abort();
      }
    });
    await page.addInitScript(() => {
      window.addEventListener("load", () => {
        (window as unknown as { __finChargement: number }).__finChargement = Date.now();
      });
    });
    return { demandesScript, envois };
  }

  test("demandé une seule fois, après le chargement de la page, jamais préchargé", async ({ page, context }) => {
    const { demandesScript, envois } = await intercepterUmami(page);
    const reponse = await page.goto("/");
    const html = await reponse!.text();
    // Ni balise script ni préchargement dans le HTML : le script n'arrive qu'après le chargement.
    expect(html).not.toMatch(/<(?:script|link)\b[^>]*(?:src|href)="[^"]*umami/i);

    await expect.poll(() => demandesScript.length, { timeout: 20_000 }).toBe(1);
    const finChargement = await page.evaluate(() => (window as unknown as { __finChargement?: number }).__finChargement);
    expect(finChargement).toBeDefined();
    expect(demandesScript[0]).toBeGreaterThanOrEqual(finChargement!);

    const script = page.locator(`script[src="${SRC_UMAMI}"]`);
    await expect(script).toHaveCount(1);
    await expect(script).toHaveAttribute("data-website-id", ID_UMAMI);
    await expect(script).toHaveAttribute("data-domains", DOMAINE_SITE);
    await expect(script).toHaveAttribute("data-exclude-search", "true");
    await expect(script).toHaveAttribute("data-before-send", NOM_FILTRE_UMAMI);
    expect(envois).toEqual([]);
    expect(await context.cookies()).toEqual([]);
  });

  test("événements émis avant le script envoyés à son arrivée, clics de contact comptés une fois", async ({ page }) => {
    const { demandesScript } = await intercepterUmami(page);
    await page.goto("/reserver?utm_source=affiche&code=GARAGE");
    await expect.poll(() => demandesScript.length, { timeout: 20_000 }).toBe(1);
    const evenements = () => page.evaluate(() => (window as unknown as { __umami?: [string, unknown][] }).__umami ?? []);
    // L'étape 1 s'affiche avant l'arrivée du script : elle attendait en mémoire.
    await expect.poll(evenements).toContainEqual(["reservation_etape_1", null]);

    // Liens ajoutés dans la page : l'écoute unique reconnaît tout lien tel: ou WhatsApp.
    await page.evaluate(() => {
      for (const [id, href] of [
        ["essai-tel", "tel:+33612345678"],
        ["essai-wa", "https://wa.me/33612345678?text=Bonjour"],
        ["essai-mail", "mailto:contact@exemple.fr"],
      ]) {
        const a = document.createElement("a");
        a.id = id!;
        a.href = href!;
        a.textContent = id!;
        a.addEventListener("click", (e) => e.preventDefault());
        document.querySelector("main")!.prepend(a);
      }
    });
    // Clic simulé sur l'élément (l'en-tête fixe le recouvre) : il remonte jusqu'à l'écoute du document.
    for (const id of ["essai-tel", "essai-wa", "essai-mail"]) await page.locator(`#${id}`).dispatchEvent("click");
    await expect.poll(async () => (await evenements()).filter(([n]) => n.startsWith("clic_"))).toEqual([
      ["clic_telephone", null],
      ["clic_whatsapp", null],
    ]);

    // Le filtre d'envoi retire les paramètres, sauf les UTM de la page.
    const filtre = await page.evaluate(
      (nom) =>
        (window as unknown as Record<string, (t: string, c: unknown) => { url: string }>)[nom]!("event", {
          url: "/reserver?utm_source=affiche&code=GARAGE&ref=AN-2026-0001",
        }),
      NOM_FILTRE_UMAMI,
    );
    expect(filtre.url).toBe("/reserver?utm_source=affiche");
  });
});
