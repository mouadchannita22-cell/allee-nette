import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import Stripe from "stripe";
import { signerLien, type DonneesLien } from "@/lib/paiement";
import {
  MOT_DE_PASSE_ADMIN_E2E,
  PAYPAL_ID_E2E,
  PAYPAL_SECRET_E2E,
  SECRET_LIENS_E2E,
  SECRET_WEBHOOK_E2E,
} from "./environnement";

/**
 * Paiement en ligne (/paiement, /paiement/merci, /admin/lien-paiement), avec
 * les valeurs de tests/e2e/environnement.ts : encaisseur A en Stripe mode
 * test et PayPal bac à sable, encaisseur B sans paiement en ligne.
 *
 * Stripe et PayPal ne sont jamais joints : le navigateur voit des réponses
 * simulées (page.route). Aucun vrai paiement n'est fait ici.
 * Projets « mobile » (375 × 812, tactile) et « ordinateur » (1280 × 800).
 */

const REF = "AN-2026-0142";
const LIEN: DonneesLien = { ref: REF, montant: "119.50", libelle: "Le Complet M", encaisseur: "A" };

function lienSigne(modifs: Partial<DonneesLien> = {}, maintenant = new Date()): string {
  return signerLien({ ...LIEN, ...modifs }, maintenant, SECRET_LIENS_E2E);
}

/** Analyse axe-core (même contournement de types que reservation.spec.ts). */
function axe(page: Page) {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

async function sansViolationGrave(page: Page) {
  const { violations } = await axe(page).analyze();
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

/** Enregistre les événements de mesure d'audience (window.umami simulé), même après une navigation. */
async function suivreEvenements(page: Page): Promise<{ nom: string; donnees?: unknown }[]> {
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

// ---------------------------------------------------------------------------
// Page /paiement
// ---------------------------------------------------------------------------

test.describe("page de paiement", () => {
  test("lien valide : récapitulatif, encaisseur, TVA et bouton de paiement", async ({ page }) => {
    const reponse = await page.goto(lienSigne());
    const entetes = reponse!.headers();
    expect(entetes["cache-control"]).toContain("no-store");
    expect(entetes["referrer-policy"]).toBe("no-referrer");
    expect(entetes["x-robots-tag"]).toContain("noindex");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    await expect(page.getByRole("heading", { level: 2, name: "Votre prestation" })).toBeVisible();
    const recap = page.locator("dl").first();
    await expect(recap).toContainText("Le Complet M");
    await expect(recap).toContainText(REF);
    await expect(recap).toContainText("119,50 €");
    await expect(page.getByText(/Paiement à .*nom de l'associé A.* EI, SIREN/)).toBeVisible();
    await expect(page.getByText("TVA non applicable, article 293 B du CGI.", { exact: true })).toBeVisible();
    await expect(page.getByText("Mode test : aucun débit réel.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Payer 119,50 € en ligne" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Moyens de paiement acceptés en ligne" })).toContainText("Apple Pay");
    await expect(page.getByText("Paiement sécurisé par Stripe. Nous ne voyons ni ne conservons vos données bancaires.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vous préférez payer sur place ?" })).toBeVisible();

    await sansDebordement(page);
    await sansViolationGrave(page);
  });

  test("encaisseur sans clé Stripe : paiement en ligne bientôt disponible", async ({ page }) => {
    await page.goto(lienSigne({ encaisseur: "B" }));
    await expect(page.getByText("Paiement en ligne bientôt disponible")).toBeVisible();
    await expect(page.getByRole("button", { name: /Payer/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Une question ?" })).toBeVisible();
  });

  test("lien falsifié : paiement refusé, contacts, aucun bouton", async ({ page }) => {
    await page.goto(lienSigne().replace("montant=119.50", "montant=19.50"));
    await expect(page.getByText("Paiement refusé")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Ce lien de paiement n'est pas valide" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nous contacter" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Payer/ })).toHaveCount(0);
    await sansDebordement(page);
    await sansViolationGrave(page);
  });

  test("lien expiré : paiement refusé, nouveau lien à demander", async ({ page }) => {
    const ilYaHuitJours = new Date(Date.now() - 8 * 86_400_000);
    await page.goto(lienSigne({}, ilYaHuitJours));
    await expect(page.getByRole("heading", { level: 2, name: "Ce lien de paiement a expiré" })).toBeVisible();
    await expect(page.getByText(/Demandez-nous un nouveau lien/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Payer/ })).toHaveCount(0);
  });

  for (const montant of ["14.99", "600.01", "-20", "cent"]) {
    test(`montant hors limites ou illisible (${montant}) : paiement refusé`, async ({ page }) => {
      await page.goto(lienSigne().replace("montant=119.50", `montant=${montant}`));
      await expect(page.getByText("Paiement refusé")).toBeVisible();
      await expect(page.getByRole("button", { name: /Payer/ })).toHaveCount(0);
    });
  }

  test("sans lien : explication et contacts", async ({ page }) => {
    await page.goto("/paiement");
    await expect(page.getByRole("heading", { level: 2, name: "Vous avez reçu un lien de paiement ?" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Payer/ })).toHaveCount(0);
    await sansDebordement(page);
  });

  test("clic sur payer : session créée par le serveur, redirection vers Stripe et événement", async ({ page }) => {
    const evenements = await suivreEvenements(page);
    let corps: unknown = null;
    await page.route("**/api/paiement/session", async (route) => {
      corps = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_simule" } });
    });
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Stripe simulé</title><h1>Stripe simulé</h1>" }),
    );

    const lien = lienSigne();
    await page.goto(lien);
    await page.getByRole("button", { name: "Payer 119,50 € en ligne" }).click();
    await page.waitForURL("https://checkout.stripe.com/c/pay/cs_test_simule");

    // Le navigateur renvoie les paramètres signés tels quels : le serveur les revérifie.
    const attendus = Object.fromEntries(new URL(lien, "http://localhost").searchParams);
    expect(corps).toEqual(attendus);
    expect(evenements).toContainEqual({ nom: "paiement_initie", donnees: { moyen: "stripe" } });
  });

  test("le serveur refuse : message annoncé avec nos contacts", async ({ page }) => {
    await page.route("**/api/paiement/session", (route) =>
      route.fulfill({ status: 502, json: { ok: false, message: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." } }),
    );
    await page.goto(lienSigne());
    await page.getByRole("button", { name: "Payer 119,50 € en ligne" }).click();
    // (Next.js a aussi son annonceur de navigation en role="alert".)
    await expect(page.getByRole("alert").filter({ hasText: "Le paiement n'a pas pu démarrer" })).toBeVisible();
    await expect(page).toHaveURL(/\/paiement\?/);
  });

  test("PayPal : aucun script tiers avant le clic, puis commande et capture côté serveur", async ({ page }) => {
    const evenements = await suivreEvenements(page);
    const appelsPayPal: string[] = [];
    page.on("request", (r) => {
      if (/paypal\.com/.test(new URL(r.url()).hostname)) appelsPayPal.push(r.url());
    });
    // SDK PayPal simulé : un bouton qui appelle createOrder puis onApprove, comme le vrai.
    await page.route("https://www.sandbox.paypal.com/sdk/js**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: `window.paypal = { version: "simulé", FUNDING: { PAYPAL: "paypal" }, Buttons: function (options) { return {
          isEligible: function () { return true; }, close: async function () {}, updateProps: async function () {},
          render: async function (element) {
            var b = document.createElement("button"); b.type = "button"; b.textContent = "PayPal simulé";
            b.onclick = async function () { try { var id = await options.createOrder({}, {}); await options.onApprove({ orderID: id }, { restart: function () {} }); } catch (e) { options.onError(e); } };
            element.appendChild(b);
          } }; } };`,
      }),
    );
    const corps: Record<string, unknown>[] = [];
    await page.route("**/api/paiement/paypal/commande", async (route) => {
      corps.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, id: "5O190127TN364715T" } });
    });
    await page.route("**/api/paiement/paypal/capture", async (route) => {
      corps.push(route.request().postDataJSON());
      await route.fulfill({
        json: { ok: true, redirection: `/paiement/merci?ref=${REF}&encaisseur=A&paypal=5O190127TN364715T` },
      });
    });

    const reponse = await page.goto(lienSigne());
    const html = await reponse!.text();
    expect(html).toContain(PAYPAL_ID_E2E);
    expect(html).not.toContain(PAYPAL_SECRET_E2E);
    await expect(page.getByText("PayPal en mode test (bac à sable) : aucun débit réel.")).toBeVisible();
    expect(appelsPayPal).toEqual([]);

    await page.getByRole("button", { name: "Payer avec PayPal" }).click();
    await page.getByRole("button", { name: "PayPal simulé" }).click();
    await page.waitForURL(/\/paiement\/merci\?/);

    expect(appelsPayPal).toHaveLength(1);
    expect(appelsPayPal[0]).toContain(`client-id=${PAYPAL_ID_E2E}`);
    expect(appelsPayPal[0]).toContain("currency=EUR");
    expect(corps[0]).toMatchObject({ ref: REF, montant: "119.50", encaisseur: "A" });
    expect(corps[1]).toMatchObject({ ref: REF, commande: "5O190127TN364715T" });
    expect(evenements).toContainEqual({ nom: "paiement_initie", donnees: { moyen: "paypal" } });
    // PayPal injoignable depuis le serveur de test : texte générique, sans erreur.
    await expect(page.getByRole("heading", { level: 1, name: "Merci" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Page /paiement/merci
// ---------------------------------------------------------------------------

test.describe("page de remerciement", () => {
  test("sans état vérifiable : remerciement générique, rendez-vous et facture", async ({ page }) => {
    const reponse = await page.goto(`/paiement/merci?ref=${REF}&encaisseur=A&session_id=cs_test_a1b2c3d4e5f6g7h8`);
    expect(reponse!.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.getByRole("heading", { level: 1, name: "Merci" })).toBeVisible();
    await expect(page.getByText(`(réf. ${REF})`)).toBeVisible();
    await expect(page.getByText("Nous vous confirmons l'heure du rendez-vous par message.")).toBeVisible();
    await expect(page.getByText("Votre facture suit par e-mail.")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await sansDebordement(page);
    await sansViolationGrave(page);
  });
});

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

test.describe("administration des liens", () => {
  test("401 sans identifiants, sur la page comme sur l'API", async ({ request }) => {
    // Chromium sans interface refuse de naviguer sur un 401 : vérifié par requête.
    const page = await request.get("/admin/lien-paiement");
    expect(page.status()).toBe(401);
    expect(page.headers()["www-authenticate"]).toMatch(/^Basic /);
    expect(page.headers()["cache-control"]).toBe("no-store");

    const mauvais = await request.get("/admin/lien-paiement", {
      headers: { Authorization: `Basic ${Buffer.from("admin:mauvais").toString("base64")}` },
    });
    expect(mauvais.status()).toBe(401);

    const api = await request.post("/api/admin/lien-paiement", { data: { ref: REF } });
    expect(api.status()).toBe(401);
  });

  test("génération d'un lien avec identifiants, puis ouverture : paiement proposé", async ({ browser }, testInfo) => {
    const contexte = await browser.newContext({
      ...testInfo.project.use,
      httpCredentials: { username: "admin", password: MOT_DE_PASSE_ADMIN_E2E },
    });
    const page = await contexte.newPage();
    const reponse = await page.goto("/admin/lien-paiement");
    expect(reponse!.status()).toBe(200);
    expect(reponse!.headers()["x-robots-tag"]).toContain("noindex");

    await page.getByLabel("Référence de la demande").fill(REF);
    await page.getByLabel("Prestation", { exact: true }).fill("Le Complet M");
    await page.getByLabel("Montant à payer, en euros").fill("119,50");
    await page.getByRole("radio", { name: /^A ·/ }).check();
    await sansViolationGrave(page);
    await page.getByRole("button", { name: "Générer le lien" }).click();

    const champ = page.getByRole("textbox", { name: "Lien de paiement" });
    await expect(champ).toHaveValue(/\/paiement\?ref=AN-2026-0142&montant=119\.50&libelle=Le%20Complet%20M&encaisseur=A&exp=\d+&sig=/);
    await sansDebordement(page);
    await sansViolationGrave(page);

    // Le lien pointe vers NEXT_PUBLIC_SITE_URL (fixée au build) : on l'ouvre sur le serveur de test.
    const url = new URL(await champ.inputValue());
    await contexte.close();
    const client = await browser.newPage({ ...testInfo.project.use });
    await client.goto(`${url.pathname}${url.search}`);
    await expect(client.getByRole("button", { name: "Payer 119,50 € en ligne" })).toBeVisible();
    await expect(client.locator("dl").first()).toContainText(REF);
    await client.close();
  });
});

// ---------------------------------------------------------------------------
// Webhook Stripe, par requête
// ---------------------------------------------------------------------------

test.describe("webhook Stripe", () => {
  test("encaisseur inconnu : 404 ; signature absente ou fausse : 400 ; signature valide : 200", async ({ request }) => {
    const corps = JSON.stringify({
      id: "evt_test_e2e",
      object: "event",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        object: {
          id: "cs_test_e2e0000000000",
          object: "checkout.session",
          status: "complete",
          payment_status: "paid",
          amount_total: 11_950,
          currency: "eur",
          metadata: { reference: REF, encaisseur: "A" },
          payment_intent: null,
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret: SECRET_WEBHOOK_E2E });
    const envoyer = (encaisseur: string, entetes: Record<string, string>) =>
      request.post(`/api/stripe/webhook/${encaisseur}`, {
        data: corps,
        headers: { "content-type": "application/json", ...entetes },
      });

    expect((await envoyer("C", { "stripe-signature": signature })).status()).toBe(404);
    expect((await envoyer("A", {})).status()).toBe(400);
    expect((await envoyer("A", { "stripe-signature": "t=1,v1=0000" })).status()).toBe(400);
    // Pas de clé de signature pour B dans l'environnement de test : refusé, Stripe réessaierait.
    expect((await envoyer("B", { "stripe-signature": signature })).status()).toBe(503);
    const ok = await envoyer("A", { "stripe-signature": signature });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual({ recu: true, message: "Paiement signalé à l'associé." });
  });
});
