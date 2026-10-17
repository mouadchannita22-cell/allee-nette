import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerLien, type DonneesLien, type LienPaiement } from "@/lib/paiement";
import { lireReponseCapture, lireReponseCommande, parametresLien } from "@/lib/encaissement/api";
import {
  capturerCommandePayPal,
  corpsCommande,
  creerCommandePayPal,
  etatCommande,
  lireConfigurationPayPal,
  montantPayPal,
  type ConfigurationPayPal,
} from "@/lib/encaissement/paypal";
import { POST as commander } from "@/app/api/paiement/paypal/commande/route";
import { POST as capturer } from "@/app/api/paiement/paypal/capture/route";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

const SECRET_LIENS = "secret-de-test-assez-long-pour-signer-0123456789";
const MAINTENANT = new Date("2026-10-17T10:00:00Z");
const COMMANDE = "5O190127TN364715T";
const DONNEES: DonneesLien = { ref: "AN-2026-0142", montant: "119.50", libelle: "Le Complet M", encaisseur: "A" };

function lien(donnees: Partial<DonneesLien> = {}, maintenant = new Date()): LienPaiement {
  return creerLien({ ...DONNEES, ...donnees }, maintenant, SECRET_LIENS);
}

/** Identifiants différents à chaque test : le jeton d'accès est gardé en mémoire par identifiant. */
let compteur = 0;
function configuration(): Extract<ConfigurationPayPal, { etat: "pret" }> {
  compteur += 1;
  return { etat: "pret", environnement: "sandbox", clientId: `client-test-${compteur}`, secret: "secret-paypal-test" };
}

/** Commande telle que PayPal la renvoie (lecture ou capture). */
function commandeJson({
  statut = "APPROVED",
  reference = "AN-2026-0142",
  valeur = "119.50",
  capture,
}: { statut?: string; reference?: string; valeur?: string; capture?: { statut: string; valeur?: string } } = {}) {
  return {
    id: COMMANDE,
    status: statut,
    purchase_units: [
      {
        reference_id: reference,
        custom_id: reference,
        amount: { currency_code: "EUR", value: valeur },
        ...(capture
          ? {
              payments: {
                captures: [
                  {
                    id: "3C679366HH908993F",
                    status: capture.statut,
                    custom_id: reference,
                    amount: { currency_code: "EUR", value: capture.valeur ?? valeur },
                    create_time: "2026-10-17T10:05:00Z",
                  },
                ],
              },
            }
          : {}),
      },
    ],
  };
}

type Appel = { url: string; methode: string; entetes: Record<string, string>; corps: string | null };

/** PayPal simulé : jeton, création, lecture et capture de commande. Aucun appel réseau. */
function fauxPayPal(reponses: {
  commande?: { statut: number; json: unknown };
  lecture?: { statut: number; json: unknown };
  capture?: { statut: number; json: unknown };
}) {
  const appels: Appel[] = [];
  const fetcher = vi.fn(async (entree: string | URL | Request, init: RequestInit = {}) => {
    const url = String(entree);
    const methode = init.method ?? "GET";
    appels.push({
      url,
      methode,
      entetes: Object.fromEntries(new Headers(init.headers).entries()),
      corps: typeof init.body === "string" ? init.body : null,
    });
    const chemin = new URL(url).pathname;
    let r: { statut: number; json: unknown } = { statut: 404, json: { name: "RESOURCE_NOT_FOUND" } };
    if (chemin === "/v1/oauth2/token") r = { statut: 200, json: { access_token: "jeton-test", expires_in: 32_400 } };
    else if (chemin === "/v2/checkout/orders" && methode === "POST") {
      r = reponses.commande ?? { statut: 201, json: { id: COMMANDE, status: "CREATED" } };
    } else if (chemin === `/v2/checkout/orders/${COMMANDE}` && methode === "GET") r = reponses.lecture ?? r;
    else if (chemin === `/v2/checkout/orders/${COMMANDE}/capture` && methode === "POST") r = reponses.capture ?? r;
    return Response.json(r.json, { status: r.statut });
  });
  return { fetcher: fetcher as unknown as typeof fetch, appels };
}

// ---------------------------------------------------------------------------
// Configuration et montants
// ---------------------------------------------------------------------------

describe("lireConfigurationPayPal", () => {
  const complet = { active: "true", environnement: "sandbox", clientId: "id-public", secret: "secret" };

  it("désactivé sans PAYPAL_ENABLED=true", () => {
    expect(lireConfigurationPayPal({ ...complet, active: undefined }, true)).toEqual({ etat: "desactive" });
    expect(lireConfigurationPayPal({ ...complet, active: "oui" }, true)).toEqual({ etat: "desactive" });
  });

  it("incomplet sans identifiant, sans secret, ou avec un environnement inconnu", () => {
    expect(lireConfigurationPayPal({ ...complet, clientId: " " }, true)).toEqual({ etat: "incomplete" });
    expect(lireConfigurationPayPal({ ...complet, secret: undefined }, true)).toEqual({ etat: "incomplete" });
    expect(lireConfigurationPayPal({ ...complet, environnement: "production" }, true)).toEqual({ etat: "incomplete" });
  });

  it("bac à sable par défaut, partout", () => {
    expect(lireConfigurationPayPal({ ...complet, environnement: undefined }, false)).toEqual({
      etat: "pret",
      environnement: "sandbox",
      clientId: "id-public",
      secret: "secret",
    });
  });

  it("refuse le mode réel hors production", () => {
    expect(lireConfigurationPayPal({ ...complet, environnement: "live" }, false)).toEqual({ etat: "reel-hors-production" });
    expect(lireConfigurationPayPal({ ...complet, environnement: "live" }, true)).toMatchObject({ etat: "pret", environnement: "live" });
  });
});

describe("montantPayPal", () => {
  it.each([
    [11_950, "119.50"],
    [11_900, "119.00"],
    [1_500, "15.00"],
    [60_000, "600.00"],
    [1_505, "15.05"],
  ])("%i centimes → %s", (centimes, attendu) => {
    expect(montantPayPal(centimes)).toBe(attendu);
  });
});

// ---------------------------------------------------------------------------
// Commande
// ---------------------------------------------------------------------------

describe("creerCommandePayPal", () => {
  it("crée une commande CAPTURE au montant du lien, avec la référence en custom_id et invoice_id", () => {
    expect(corpsCommande(lien())).toEqual({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "AN-2026-0142",
          custom_id: "AN-2026-0142",
          invoice_id: "AN-2026-0142",
          description: "Allée Nette — Le Complet M — réf. AN-2026-0142",
          amount: { currency_code: "EUR", value: "119.50" },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Allée Nette",
            locale: "fr-FR",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        },
      },
    });
  });

  it("obtient un jeton avec l'identifiant et le secret, puis crée la commande côté serveur", async () => {
    const config = configuration();
    const { fetcher, appels } = fauxPayPal({});
    const l = lien({}, MAINTENANT);

    await expect(creerCommandePayPal(config, l, MAINTENANT, fetcher)).resolves.toBe(COMMANDE);

    expect(appels).toHaveLength(2);
    const [jeton, commande] = appels;
    expect(jeton!.url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect(jeton!.entetes.authorization).toBe(`Basic ${btoa(`${config.clientId}:secret-paypal-test`)}`);
    expect(jeton!.corps).toBe("grant_type=client_credentials");
    expect(commande!.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(commande!.methode).toBe("POST");
    expect(commande!.entetes.authorization).toBe("Bearer jeton-test");
    expect(commande!.entetes["paypal-request-id"]).toBe(
      `allee-nette-commande-${l.sig}-${Math.floor(MAINTENANT.getTime() / 60_000)}`,
    );
    expect(JSON.parse(commande!.corps!)).toEqual(corpsCommande(l));
  });

  it("garde le jeton en mémoire tant qu'il est valable", async () => {
    const config = configuration();
    const { fetcher, appels } = fauxPayPal({});
    await creerCommandePayPal(config, lien(), MAINTENANT, fetcher);
    await creerCommandePayPal(config, lien(), MAINTENANT, fetcher);
    expect(appels.filter((a) => a.url.endsWith("/v1/oauth2/token"))).toHaveLength(1);
  });

  it("signale une erreur PayPal sans citer le secret", async () => {
    const { fetcher } = fauxPayPal({ commande: { statut: 422, json: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "DUPLICATE_INVOICE_ID" }] } } });
    const erreur = await creerCommandePayPal(configuration(), lien(), MAINTENANT, fetcher).catch((e: unknown) => e);
    expect(erreur).toMatchObject({ name: "ErreurPayPal", etape: "commande", statut: 422, code: "DUPLICATE_INVOICE_ID" });
    expect(String((erreur as Error).message)).not.toContain("secret-paypal-test");
  });
});

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

describe("capturerCommandePayPal", () => {
  it("relit la commande, vérifie montant et référence, puis capture", async () => {
    const { fetcher, appels } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson() },
      capture: { statut: 201, json: commandeJson({ statut: "COMPLETED", capture: { statut: "COMPLETED" } }) },
    });
    const resultat = await capturerCommandePayPal(configuration(), lien(), COMMANDE, fetcher);
    expect(resultat).toEqual({
      statut: "paye",
      captureId: "3C679366HH908993F",
      centimes: 11_950,
      date: new Date("2026-10-17T10:05:00Z"),
    });
    const capture = appels.find((a) => a.url.endsWith("/capture"))!;
    expect(capture.entetes["paypal-request-id"]).toBe(`allee-nette-capture-${COMMANDE}`);
  });

  it.each([
    ["un autre montant", commandeJson({ valeur: "19.50" })],
    ["une autre référence", commandeJson({ reference: "AN-2026-0999" })],
  ])("ne capture jamais une commande avec %s", async (_cas, json) => {
    const { fetcher, appels } = fauxPayPal({ lecture: { statut: 200, json } });
    await expect(capturerCommandePayPal(configuration(), lien(), COMMANDE, fetcher)).resolves.toEqual({ statut: "incoherente" });
    expect(appels.some((a) => a.url.endsWith("/capture"))).toBe(false);
  });

  it("ne capture pas deux fois une commande déjà réglée", async () => {
    const { fetcher, appels } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson({ statut: "COMPLETED", capture: { statut: "COMPLETED" } }) },
    });
    await expect(capturerCommandePayPal(configuration(), lien(), COMMANDE, fetcher)).resolves.toMatchObject({ statut: "paye" });
    expect(appels.some((a) => a.url.endsWith("/capture"))).toBe(false);
  });

  it("propose un autre moyen de paiement si PayPal refuse celui choisi", async () => {
    const { fetcher } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson() },
      capture: { statut: 422, json: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] } },
    });
    await expect(capturerCommandePayPal(configuration(), lien(), COMMANDE, fetcher)).resolves.toEqual({
      statut: "instrument-refuse",
    });
  });

  it("signale une capture en attente chez PayPal", async () => {
    const { fetcher } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson() },
      capture: { statut: 201, json: commandeJson({ statut: "COMPLETED", capture: { statut: "PENDING" } }) },
    });
    await expect(capturerCommandePayPal(configuration(), lien(), COMMANDE, fetcher)).resolves.toMatchObject({
      statut: "en-cours",
    });
  });

  it("refuse un identifiant de commande mal formé sans appeler PayPal", async () => {
    const { fetcher, appels } = fauxPayPal({});
    await expect(capturerCommandePayPal(configuration(), lien(), "../../v1/autre", fetcher)).resolves.toEqual({
      statut: "incoherente",
    });
    expect(appels).toHaveLength(0);
  });
});

describe("etatCommande", () => {
  it("lit une commande sans faire confiance à sa forme", () => {
    expect(etatCommande(null, "AN-2026-0142")).toEqual({ statut: "non-paye" });
    expect(etatCommande({ purchase_units: "x" }, "AN-2026-0142")).toEqual({ statut: "non-paye" });
    expect(etatCommande(commandeJson({ statut: "CREATED" }), "AN-2026-0142")).toEqual({ statut: "non-paye" });
    expect(etatCommande(commandeJson(), "AN-2026-0142")).toEqual({ statut: "approuvee", centimes: 11_950 });
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

let ip = 0;
function requete(url: string, corps: unknown): Request {
  ip += 1;
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", "x-forwarded-for": `192.0.2.${ip}` },
    body: JSON.stringify(corps),
  });
}

describe("routes PayPal", () => {
  beforeEach(() => {
    compteur += 1;
    vi.stubEnv("PAYMENT_LINK_SECRET", SECRET_LIENS);
    vi.stubEnv("PAYPAL_ENABLED", "true");
    vi.stubEnv("PAYPAL_ENV", "sandbox");
    vi.stubEnv("PAYPAL_CLIENT_ID_A", `client-route-${compteur}`);
    vi.stubEnv("PAYPAL_CLIENT_SECRET_A", "secret-paypal-test");
    vi.stubEnv("PAYPAL_CLIENT_ID_B", "");
    vi.stubEnv("PAYPAL_CLIENT_SECRET_B", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("crée la commande d'un lien valide", async () => {
    const { fetcher } = fauxPayPal({});
    vi.stubGlobal("fetch", fetcher);
    const r = await commander(requete("/api/paiement/paypal/commande", parametresLien(lien())));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(lireReponseCommande(await r.json())).toEqual({ ok: true, id: COMMANDE });
  });

  it("refuse un lien falsifié sans appeler PayPal", async () => {
    const { fetcher, appels } = fauxPayPal({});
    vi.stubGlobal("fetch", fetcher);
    const r = await commander(requete("/api/paiement/paypal/commande", { ...parametresLien(lien()), montant: "1.50" }));
    expect(r.status).toBe(422);
    expect(appels).toHaveLength(0);
  });

  it("503 si PayPal n'est pas configuré pour l'encaisseur", async () => {
    const { fetcher, appels } = fauxPayPal({});
    vi.stubGlobal("fetch", fetcher);
    const r = await commander(requete("/api/paiement/paypal/commande", parametresLien(lien({ encaisseur: "B" }))));
    expect(r.status).toBe(503);
    expect(appels).toHaveLength(0);
  });

  it("capture, prévient l'associé (démonstration) et renvoie vers la page de remerciement", async () => {
    const { fetcher } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson() },
      capture: { statut: 201, json: commandeJson({ statut: "COMPLETED", capture: { statut: "COMPLETED" } }) },
    });
    vi.stubGlobal("fetch", fetcher);
    const r = await capturer(requete("/api/paiement/paypal/capture", { ...parametresLien(lien()), commande: COMMANDE }));
    expect(r.status).toBe(200);
    expect(lireReponseCapture(await r.json())).toEqual({
      ok: true,
      redirection: `/paiement/merci?ref=AN-2026-0142&encaisseur=A&paypal=${COMMANDE}`,
    });
    const journal = vi.mocked(console.info).mock.calls.flat().join("\n");
    expect(journal).toContain("Démonstration, aucun e-mail envoyé : [TEST] Paiement reçu AN-2026-0142 · 119,50 € · PayPal");
    expect(journal).not.toContain("secret-paypal-test");
  });

  it("demande de relancer si PayPal refuse le moyen de paiement", async () => {
    const { fetcher } = fauxPayPal({
      lecture: { statut: 200, json: commandeJson() },
      capture: { statut: 422, json: { details: [{ issue: "INSTRUMENT_DECLINED" }] } },
    });
    vi.stubGlobal("fetch", fetcher);
    const r = await capturer(requete("/api/paiement/paypal/capture", { ...parametresLien(lien()), commande: COMMANDE }));
    expect(r.status).toBe(422);
    expect(lireReponseCapture(await r.json())).toMatchObject({ ok: false, relancer: true });
  });

  it("refuse une commande qui ne correspond pas au lien", async () => {
    const { fetcher } = fauxPayPal({ lecture: { statut: 200, json: commandeJson({ valeur: "15.00" }) } });
    vi.stubGlobal("fetch", fetcher);
    const r = await capturer(requete("/api/paiement/paypal/capture", { ...parametresLien(lien()), commande: COMMANDE }));
    expect(r.status).toBe(409);
    expect(vi.mocked(console.error).mock.calls.flat().join(" ")).toContain("différente du lien");
  });

  it("refuse une commande illisible", async () => {
    const r = await capturer(requete("/api/paiement/paypal/capture", { ...parametresLien(lien()), commande: "x/../y" }));
    expect(r.status).toBe(400);
  });
});
