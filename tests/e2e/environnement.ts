/**
 * Valeurs de test des tests de bout en bout, partagées entre
 * playwright.config.ts (variables du serveur) et les tests (signature des
 * liens, identifiants de l'administration, webhooks).
 *
 * Aucune n'est une vraie clé : les « clés » Stripe ont la forme d'une clé de
 * test, mais sont trop courtes pour être prises pour de vraies clés (voir
 * tests/unit/fuite-cles.test.ts) et ne joignent jamais Stripe : les appels
 * sont interceptés dans le navigateur (page.route) ou échouent sans réseau.
 */
export const SECRET_LIENS_E2E = "secret-des-tests-de-bout-en-bout-0123456789";
export const MOT_DE_PASSE_ADMIN_E2E = "mot-de-passe-des-tests-e2e";
export const CLE_STRIPE_E2E = "sk_test_e2e_factice";
export const SECRET_WEBHOOK_E2E = "whsec_e2e_factice";
export const PAYPAL_ID_E2E = "id-public-paypal-e2e";
export const PAYPAL_SECRET_E2E = "secret-paypal-e2e";

/**
 * Variables du serveur de test : encaisseur A avec Stripe (mode test) et
 * PayPal (bac à sable), encaisseur B sans aucun moyen de paiement en ligne.
 */
export const ENVIRONNEMENT_PAIEMENT_E2E: Record<string, string> = {
  PAYMENT_LINK_SECRET: SECRET_LIENS_E2E,
  ADMIN_PASSWORD: MOT_DE_PASSE_ADMIN_E2E,
  STRIPE_API_KEY_A: CLE_STRIPE_E2E,
  STRIPE_API_KEY_B: "",
  STRIPE_WEBHOOK_SECRET_A: SECRET_WEBHOOK_E2E,
  STRIPE_WEBHOOK_SECRET_B: "",
  PAYPAL_ENABLED: "true",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID_A: PAYPAL_ID_E2E,
  PAYPAL_CLIENT_SECRET_A: PAYPAL_SECRET_E2E,
  PAYPAL_CLIENT_ID_B: "",
  PAYPAL_CLIENT_SECRET_B: "",
};
