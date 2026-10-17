import { defineConfig } from "@playwright/test";
import { ENVIRONNEMENT_PAIEMENT_E2E } from "./tests/e2e/environnement";

/**
 * Tests de bout en bout (Playwright) : `npm run build`, puis `npx playwright test`.
 *
 * - Le serveur de production démarre sur le port 3100 (`npm run start`), ou
 *   un serveur déjà lancé sur ce port est réutilisé (il garde alors ses
 *   propres variables d'environnement).
 * - Mode démonstration : sans clé Resend et hors contexte « production »,
 *   les demandes sont vérifiées puis acceptées sans envoyer d'e-mail.
 * - RESERVATION_LIMITE_DEBIT relève la limite de 5 demandes par 10 minutes,
 *   pour que les parcours répétés ne soient pas refusés. Ce réglage est
 *   ignoré en production (lib/reservation/anti-spam.ts).
 * - Paiement : valeurs de test (tests/e2e/environnement.ts) pour
 *   PAYMENT_LINK_SECRET, ADMIN_PASSWORD, Stripe et PayPal. Aucune vraie clé :
 *   les requêtes du navigateur vers Stripe et PayPal sont interceptées, celles
 *   du serveur échouent (clés factices). Aucun paiement réel n'est possible.
 * - Chromium : CHROMIUM_PATH, sinon le navigateur installé dans le conteneur
 *   de développement.
 * - Sorties dans test-results/ et playwright-report/, ignorés par git.
 */
const PORT = 3100;
const chromium = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    launchOptions: { executablePath: chromium },
  },
  projects: [
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
    {
      name: "ordinateur",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { RESERVATION_LIMITE_DEBIT: "1000", RESEND_API_KEY: "", ...ENVIRONNEMENT_PAIEMENT_E2E },
  },
});
