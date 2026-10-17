import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "@/config/site";
import { creerLien, type DonneesLien, type LienPaiement } from "@/lib/paiement";
import { parametresLien, lireReponseSession } from "@/lib/encaissement/api";
import {
  IDENTIFIANT_INTEGRATION,
  cleIdempotence,
  creerSessionCheckout,
  descriptionErreur,
  lireConfigurationStripe,
  parametresSessionCheckout,
  type ClientStripe,
} from "@/lib/encaissement/stripe";
import { POST } from "@/app/api/paiement/session/route";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

/**
 * Client Stripe simulé : aucun appel réseau. Chaque `new Stripe(cle)` est
 * enregistré, et la création de session renvoie ce que le test a prévu.
 */
const simule = vi.hoisted(() => ({ cles: [] as string[], creer: vi.fn() }));
vi.mock("stripe", () => {
  class StripeSimule {
    checkout = { sessions: { create: simule.creer, retrieve: vi.fn() } };
    paymentIntents = { retrieve: vi.fn() };
    constructor(cle: string) {
      simule.cles.push(cle);
    }
  }
  return { default: StripeSimule, Stripe: StripeSimule };
});

const SECRET = "secret-de-test-assez-long-pour-signer-0123456789";
const MAINTENANT = new Date("2026-10-17T10:00:00Z");
// Fausses clés, trop courtes pour ressembler à de vraies (voir fuite-cles.test.ts).
const CLE_TEST_A = "sk_test_cle_A";
const CLE_TEST_B = "rk_test_cle_B";
const CLE_REELLE = "rk_live_cle_A";

const DONNEES: DonneesLien = { ref: "AN-2026-0142", montant: "119.50", libelle: "Le Complet M", encaisseur: "A" };

function lien(donnees: Partial<DonneesLien> = {}, maintenant = new Date()): LienPaiement {
  return creerLien({ ...DONNEES, ...donnees }, maintenant, SECRET);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe("lireConfigurationStripe", () => {
  it("sans clé : paiement en ligne bientôt disponible", () => {
    expect(lireConfigurationStripe(undefined, false)).toEqual({ etat: "absente" });
    expect(lireConfigurationStripe("   ", true)).toEqual({ etat: "absente" });
  });

  it.each([
    ["sk_test_cle", "test"],
    ["rk_test_cle", "test"],
  ])("clé de test %s : mode test, partout", (cle, mode) => {
    expect(lireConfigurationStripe(cle, false)).toEqual({ etat: "prete", cle, mode });
    expect(lireConfigurationStripe(` ${cle} `, true)).toEqual({ etat: "prete", cle, mode });
  });

  it.each(["sk_live_cle", "rk_live_cle"])("refuse la clé réelle %s hors production", (cle) => {
    expect(lireConfigurationStripe(cle, false)).toEqual({ etat: "reel-hors-production" });
    expect(lireConfigurationStripe(cle, true)).toEqual({ etat: "prete", cle, mode: "reel" });
  });

  it.each(["pk_test_cle", "whsec_cle", "sk_cle", "clé"])("signale une valeur illisible (%s)", (cle) => {
    expect(lireConfigurationStripe(cle, true)).toEqual({ etat: "illisible" });
  });
});

describe("descriptionErreur", () => {
  it("garde le type, le code et le statut, jamais le message", () => {
    const erreur = Object.assign(new Error(`Invalid API Key provided: ${CLE_TEST_A}`), {
      type: "StripeAuthenticationError",
      code: "api_key_invalid",
      statusCode: 401,
    });
    expect(descriptionErreur(erreur)).toBe("StripeAuthenticationError, api_key_invalid, 401");
    expect(descriptionErreur(new TypeError(CLE_TEST_A))).toBe("TypeError");
    expect(descriptionErreur(null)).toBe("erreur inconnue");
  });
});

// ---------------------------------------------------------------------------
// Session Checkout
// ---------------------------------------------------------------------------

describe("parametresSessionCheckout", () => {
  it("envoie exactement le montant en centimes, la devise, les métadonnées, les adresses et la locale", () => {
    const l = lien({}, MAINTENANT);
    expect(parametresSessionCheckout(l, "https://www.exemple.fr")).toEqual({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 11_950,
            product_data: { name: "Allée Nette — Le Complet M — réf. AN-2026-0142" },
          },
        },
      ],
      metadata: { reference: "AN-2026-0142", encaisseur: "A" },
      payment_intent_data: {
        metadata: { reference: "AN-2026-0142", encaisseur: "A" },
        description: "Allée Nette — Le Complet M — réf. AN-2026-0142",
      },
      client_reference_id: "AN-2026-0142",
      locale: "fr",
      success_url:
        "https://www.exemple.fr/paiement/merci?ref=AN-2026-0142&encaisseur=A&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: `https://www.exemple.fr${l.chemin}`,
      integration_identifier: IDENTIFIANT_INTEGRATION,
    });
  });

  it("ne fixe jamais les moyens de paiement : ils se règlent dans le tableau de bord Stripe", () => {
    const parametres = parametresSessionCheckout(lien());
    expect(parametres).not.toHaveProperty("payment_method_types");
    expect(JSON.stringify(parametres)).not.toContain("payment_method");
  });

  it("revient sur le lien signé d'origine en cas d'abandon, sur l'adresse du site par défaut", () => {
    const l = lien({ encaisseur: "B", libelle: "L'Intérieur Net (S)" });
    const parametres = parametresSessionCheckout(l);
    expect(parametres.cancel_url).toBe(`${site.url}${l.chemin}`);
    expect(parametres.cancel_url).toContain("libelle=L%27Int%C3%A9rieur%20Net%20%28S%29");
    expect(parametres.success_url).toBe(
      `${site.url}/paiement/merci?ref=AN-2026-0142&encaisseur=B&session_id={CHECKOUT_SESSION_ID}`,
    );
    expect(parametres.metadata).toEqual({ reference: "AN-2026-0142", encaisseur: "B" });
  });

  it("garde une étiquette d'intégration constante", () => {
    expect(IDENTIFIANT_INTEGRATION).toMatch(/^allee-nette-lien-signe-[a-z]{8}$/);
  });
});

describe("cleIdempotence", () => {
  it("dépend de la signature et de la minute en cours", () => {
    const l = lien({}, MAINTENANT);
    const cle = cleIdempotence(l, MAINTENANT);
    expect(cle).toBe(`allee-nette/checkout/${l.sig}/${Math.floor(MAINTENANT.getTime() / 60_000)}`);
    expect(cleIdempotence(l, new Date(MAINTENANT.getTime() + 59_000))).toBe(cle);
    expect(cleIdempotence(l, new Date(MAINTENANT.getTime() + 60_000))).not.toBe(cle);
    expect(cleIdempotence(lien({ montant: "120" }, MAINTENANT), MAINTENANT)).not.toBe(cle);
  });
});

describe("creerSessionCheckout", () => {
  it("crée la session avec la clé d'idempotence et renvoie l'adresse de paiement", async () => {
    const create = vi.fn().mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const client = { checkout: { sessions: { create } } } as unknown as ClientStripe;
    const l = lien({}, MAINTENANT);

    await expect(creerSessionCheckout(client, l, MAINTENANT)).resolves.toEqual({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
    expect(create).toHaveBeenCalledExactlyOnceWith(parametresSessionCheckout(l), {
      idempotencyKey: cleIdempotence(l, MAINTENANT),
    });
  });

  it("refuse une session sans adresse", async () => {
    const create = vi.fn().mockResolvedValue({ id: "cs_test_2", url: null });
    const client = { checkout: { sessions: { create } } } as unknown as ClientStripe;
    await expect(creerSessionCheckout(client, lien(), MAINTENANT)).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// Route POST /api/paiement/session
// ---------------------------------------------------------------------------

let ip = 0;

function requete(corps: unknown, entetes: Record<string, string> = {}): Request {
  ip += 1;
  return new Request("http://localhost:3000/api/paiement/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": `203.0.113.${ip}`,
      ...entetes,
    },
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
  });
}

describe("POST /api/paiement/session", () => {
  beforeEach(() => {
    vi.stubEnv("PAYMENT_LINK_SECRET", SECRET);
    vi.stubEnv("STRIPE_API_KEY_A", CLE_TEST_A);
    vi.stubEnv("STRIPE_API_KEY_B", CLE_TEST_B);
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "");
    simule.creer.mockReset();
    simule.creer.mockResolvedValue({ id: "cs_test_42", url: "https://checkout.stripe.com/c/pay/cs_test_42" });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("crée la session avec le compte de l'encaisseur A et renvoie l'adresse Stripe", async () => {
    const l = lien();
    const r = await POST(requete(parametresLien(l)));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(lireReponseSession(await r.json())).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_42" });
    expect(simule.cles.at(-1)).toBe(CLE_TEST_A);
    const [parametres, options] = simule.creer.mock.calls[0]!;
    expect(parametres).toEqual(parametresSessionCheckout(l));
    expect(options.idempotencyKey).toMatch(new RegExp(`^allee-nette/checkout/${l.sig}/\\d+$`));
  });

  it("utilise la clé de l'encaisseur B pour un lien de B", async () => {
    const r = await POST(requete(parametresLien(lien({ encaisseur: "B" }))));
    expect(r.status).toBe(200);
    expect(simule.cles).toContain(CLE_TEST_B);
    expect(simule.creer.mock.calls[0]![0].metadata).toEqual({ reference: "AN-2026-0142", encaisseur: "B" });
  });

  it("sans clé pour l'encaisseur : 503 avec nos contacts, sans appeler Stripe", async () => {
    vi.stubEnv("STRIPE_API_KEY_B", "");
    const r = await POST(requete(parametresLien(lien({ encaisseur: "B" }))));
    expect(r.status).toBe(503);
    const json = await r.json();
    expect(json.ok).toBe(false);
    expect(json.message).toContain("pas encore disponible");
    expect(json.message).toContain("Appelez-nous");
    expect(simule.creer).not.toHaveBeenCalled();
  });

  it("refuse une clé réelle hors production, sans jamais la citer", async () => {
    vi.stubEnv("STRIPE_API_KEY_A", CLE_REELLE);
    const r = await POST(requete(parametresLien(lien())));
    expect(r.status).toBe(503);
    expect(simule.creer).not.toHaveBeenCalled();
    const journal = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(journal).toContain("STRIPE_API_KEY_A est une clé réelle : refusée hors production");
    expect(journal).not.toContain(CLE_REELLE);
    expect(JSON.stringify(await r.json())).not.toContain(CLE_REELLE);
  });

  it("accepte la clé réelle en production", async () => {
    vi.stubEnv("STRIPE_API_KEY_A", CLE_REELLE);
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "production");
    const r = await POST(requete(parametresLien(lien())));
    expect(r.status).toBe(200);
    expect(simule.cles.at(-1)).toBe(CLE_REELLE);
  });

  it("refuse un lien falsifié, sans appeler Stripe", async () => {
    const r = await POST(requete({ ...parametresLien(lien()), montant: "19.50" }));
    expect(r.status).toBe(422);
    expect((await r.json()).message).toContain("n'est pas valide");
    expect(simule.creer).not.toHaveBeenCalled();
  });

  it("refuse un lien expiré", async () => {
    const ancien = lien({}, new Date(Date.now() - 8 * 86_400_000));
    const r = await POST(requete(parametresLien(ancien)));
    expect(r.status).toBe(422);
    expect((await r.json()).message).toContain("a expiré");
    expect(simule.creer).not.toHaveBeenCalled();
  });

  it("refuse une demande venue d'un autre site, ou qui n'est pas du JSON", async () => {
    const corps = parametresLien(lien());
    expect((await POST(requete(corps, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await POST(requete(JSON.stringify(corps), { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(requete("{pas du json"))).status).toBe(400);
    expect((await POST(requete([corps]))).status).toBe(400);
    expect((await POST(requete({ ...corps, bourrage: "x".repeat(5_000) }))).status).toBe(413);
    expect(simule.creer).not.toHaveBeenCalled();
  });

  it("limite le débit par adresse IP", async () => {
    const corps = parametresLien(lien());
    const depuis = { "x-forwarded-for": "198.51.100.7" };
    for (let i = 0; i < 10; i++) expect((await POST(requete(corps, depuis))).status).toBe(200);
    const r = await POST(requete(corps, depuis));
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("répond 502 si Stripe échoue, et ne journalise ni la clé ni le message de Stripe", async () => {
    simule.creer.mockRejectedValue(
      Object.assign(new Error(`Invalid API Key provided: ${CLE_TEST_A}`), {
        type: "StripeAuthenticationError",
        statusCode: 401,
      }),
    );
    const r = await POST(requete(parametresLien(lien())));
    expect(r.status).toBe(502);
    const json = await r.json();
    expect(json.message).toContain("n'a pas pu démarrer");
    const journal = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(journal).toContain("StripeAuthenticationError, 401");
    expect(journal).not.toContain(CLE_TEST_A);
    expect(JSON.stringify(json)).not.toContain(CLE_TEST_A);
  });
});

describe("lireReponseSession", () => {
  it("n'accepte qu'une adresse https", () => {
    expect(lireReponseSession({ ok: true, url: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(lireReponseSession({ ok: false, message: "Refusé." })).toEqual({ ok: false, message: "Refusé." });
    expect(lireReponseSession(null)).toMatchObject({ ok: false });
  });
});
