import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Courriel } from "@/lib/reservation/emails";
import type { StatutEnvoi } from "@/lib/encaissement/envoi";
import { etatPaiementRetour, etatSessionCheckout, type DependancesRetour } from "@/lib/encaissement/retour";
import type { ClientStripe } from "@/lib/encaissement/stripe";
import { moyenDuPaiement, traiterWebhook, type DependancesWebhook } from "@/lib/encaissement/webhook";
import { POST } from "@/app/api/stripe/webhook/[encaisseur]/route";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

// Fausses clés de signature, trop courtes pour ressembler à de vraies (voir fuite-cles.test.ts).
const SECRET_A = "whsec_cle_A_de_test";
const SECRET_B = "whsec_cle_B_de_test";
const SESSION = "cs_test_a1b2c3d4e5f6g7h8";

type Session = Partial<Stripe.Checkout.Session>;

/** Corps d'un événement Stripe, tel qu'il arrive sur le webhook. */
function evenement(type: string, session: Session = {}, { livemode = false } = {}): string {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type,
    created: 1_792_158_120, // vendredi 16 octobre 2026, 15 h 42 à Paris
    livemode,
    data: {
      object: {
        id: SESSION,
        object: "checkout.session",
        status: "complete",
        payment_status: "paid",
        amount_total: 11_950,
        currency: "eur",
        metadata: { reference: "AN-2026-0142", encaisseur: "A" },
        payment_intent: "pi_test_123",
        ...session,
      },
    },
  });
}

/** En-tête Stripe-Signature, calculé comme le fait Stripe. */
function signer(corps: string, secret = SECRET_A): string {
  return Stripe.webhooks.generateTestHeaderString({ payload: corps, secret });
}

/** PaymentIntent lu avec latest_charge : carte via Apple Pay. */
const INTENT = {
  id: "pi_test_123",
  payment_method_types: ["card", "paypal"],
  latest_charge: { id: "ch_test_1", payment_method_details: { type: "card", card: { wallet: { type: "apple_pay" } } } },
};

function dependances(modifs: Partial<DependancesWebhook> = {}) {
  const envoyer = vi.fn<(courriel: Courriel, idempotence: string) => Promise<StatutEnvoi>>().mockResolvedValue("envoye");
  const retrieve = vi.fn().mockResolvedValue(INTENT);
  const client = { paymentIntents: { retrieve } } as unknown as ClientStripe;
  const deps: DependancesWebhook = { secret: SECRET_A, webhooks: Stripe.webhooks, client, envoyer, ...modifs };
  return { deps, envoyer, retrieve };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Traitement des événements
// ---------------------------------------------------------------------------

describe("traiterWebhook", () => {
  it("signature valide, session payée : e-mail « paiement reçu » à l'associé, avec le moyen de paiement", async () => {
    const { deps, envoyer, retrieve } = dependances();
    const corps = evenement("checkout.session.completed");

    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 200 });

    expect(retrieve).toHaveBeenCalledExactlyOnceWith("pi_test_123", { expand: ["latest_charge"] });
    expect(envoyer).toHaveBeenCalledOnce();
    const [courriel, idempotence] = envoyer.mock.calls[0]!;
    expect(idempotence).toBe(`paiement-recu/${SESSION}`);
    expect(courriel.objet).toBe("[TEST] Paiement reçu AN-2026-0142 · 119,50 € · Stripe");
    expect(courriel.texte).toContain("Moyen de paiement : Carte bancaire via Apple Pay (card)");
    expect(courriel.texte).toContain("Date : vendredi 16 octobre 2026 à 15 h 42");
    expect(courriel.texte).toContain(`Identifiant de la session : ${SESSION}`);
  });

  it("en mode réel, l'objet ne porte pas la mention [TEST]", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.completed", {}, { livemode: true });
    await traiterWebhook("A", corps, signer(corps), deps);
    expect(envoyer.mock.calls[0]![0].objet).toBe("Paiement reçu AN-2026-0142 · 119,50 € · Stripe");
  });

  it("session terminée mais paiement différé : rien à signaler tant qu'il n'est pas reçu", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.completed", { payment_status: "unpaid" });
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 200 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("paiement différé réussi : e-mail « paiement reçu »", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.async_payment_succeeded");
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 200 });
    expect(envoyer.mock.calls[0]![0].objet).toContain("Paiement reçu AN-2026-0142");
  });

  it("paiement différé échoué : e-mail d'alerte", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.async_payment_failed", { payment_status: "unpaid" });
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 200 });
    const [courriel, idempotence] = envoyer.mock.calls[0]!;
    expect(courriel.objet).toBe("[TEST] Paiement échoué AN-2026-0142 · 119,50 €");
    expect(idempotence).toBe(`paiement-echoue/${SESSION}`);
  });

  it("refuse une signature invalide, sans rien traiter", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.completed");
    await expect(traiterWebhook("A", corps, signer(corps, SECRET_B), deps)).resolves.toMatchObject({ statut: 400 });
    await expect(traiterWebhook("A", corps, "t=1,v1=abc", deps)).resolves.toMatchObject({ statut: 400 });
    await expect(traiterWebhook("A", corps, null, deps)).resolves.toMatchObject({ statut: 400 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("refuse un corps modifié après signature", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.completed");
    const modifie = corps.replace("11950", "1");
    await expect(traiterWebhook("A", modifie, signer(corps), deps)).resolves.toMatchObject({ statut: 400 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("sans clé de signature : 503, Stripe réessaiera", async () => {
    const { deps, envoyer } = dependances({ secret: " " });
    const corps = evenement("checkout.session.completed");
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 503 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("ignore les autres événements (200 sans action)", async () => {
    const { deps, envoyer, retrieve } = dependances();
    const corps = evenement("checkout.session.expired", { status: "expired", payment_status: "unpaid" });
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toEqual({ statut: 200, message: "Événement ignoré." });
    expect(envoyer).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("ignore une session créée hors du site (sans référence Allée Nette)", async () => {
    const { deps, envoyer } = dependances();
    const corps = evenement("checkout.session.completed", { metadata: {} });
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 200 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("e-mail non envoyé : 500 pour que Stripe réessaie", async () => {
    const { deps, envoyer } = dependances();
    envoyer.mockResolvedValue("echec");
    const corps = evenement("checkout.session.completed");
    await expect(traiterWebhook("A", corps, signer(corps), deps)).resolves.toMatchObject({ statut: 500 });
  });

  it("sans client Stripe, ou si Stripe ne répond pas, l'e-mail part quand même", async () => {
    const corps = evenement("checkout.session.completed");
    const sansClient = dependances({ client: null });
    await traiterWebhook("A", corps, signer(corps), sansClient.deps);
    expect(sansClient.envoyer.mock.calls[0]![0].texte).toContain("Moyen de paiement : Non précisé (voir le tableau de bord Stripe)");

    const enPanne = dependances();
    enPanne.retrieve.mockRejectedValue(Object.assign(new Error("réseau"), { type: "StripeConnectionError" }));
    await expect(traiterWebhook("A", corps, signer(corps), enPanne.deps)).resolves.toMatchObject({ statut: 200 });
    expect(enPanne.envoyer).toHaveBeenCalledOnce();
  });
});

describe("moyenDuPaiement", () => {
  it.each([
    [{ latest_charge: { payment_method_details: { type: "card", card: { wallet: { type: "google_pay" } } } } }, "Carte bancaire via Google Pay (card)"],
    [{ latest_charge: { payment_method_details: { type: "card", card: { wallet: null } } } }, "Carte bancaire (card)"],
    [{ latest_charge: { payment_method_details: { type: "paypal" } } }, "PayPal (paypal)"],
    [{ latest_charge: "ch_123", payment_method_types: ["paypal"] }, "PayPal (paypal)"],
    [{ latest_charge: null, payment_method_types: ["card", "paypal"] }, "Non précisé (voir le tableau de bord Stripe)"],
  ])("lit le type et le portefeuille (%#)", (intent, attendu) => {
    expect(moyenDuPaiement({ payment_method_types: [], ...intent } as unknown as Stripe.PaymentIntent)).toBe(attendu);
  });
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

function requete(encaisseur: string, corps: string, signature: string | null): [Request, { params: Promise<{ encaisseur: string }> }] {
  return [
    new Request(`http://localhost:3000/api/stripe/webhook/${encaisseur}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(signature ? { "stripe-signature": signature } : {}) },
      body: corps,
    }),
    { params: Promise.resolve({ encaisseur }) },
  ];
}

describe("POST /api/stripe/webhook/[encaisseur]", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_A", SECRET_A);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_B", SECRET_B);
    vi.stubEnv("STRIPE_API_KEY_A", "");
    vi.stubEnv("STRIPE_API_KEY_B", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "");
  });

  it("encaisseur inconnu : 404", async () => {
    const corps = evenement("checkout.session.completed");
    const r = await POST(...requete("C", corps, signer(corps)));
    expect(r.status).toBe(404);
  });

  it("signature valide : 200, e-mail en démonstration hors production", async () => {
    const corps = evenement("checkout.session.completed");
    const r = await POST(...requete("A", corps, signer(corps)));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ recu: true, message: "Paiement signalé à l'associé." });
    expect(vi.mocked(console.info).mock.calls.flat().join(" ")).toContain("Démonstration, aucun e-mail envoyé");
  });

  it("chaque compte a sa clé : un événement signé pour A est refusé sur B", async () => {
    const corps = evenement("checkout.session.completed");
    expect((await POST(...requete("B", corps, signer(corps, SECRET_A)))).status).toBe(400);
    expect((await POST(...requete("B", corps, signer(corps, SECRET_B)))).status).toBe(200);
  });

  it("signature invalide ou absente : 400", async () => {
    const corps = evenement("checkout.session.completed");
    expect((await POST(...requete("A", corps, "t=1,v1=0000")))).toHaveProperty("status", 400);
    expect((await POST(...requete("A", corps, null)))).toHaveProperty("status", 400);
  });

  it("événement ignoré : 200 sans action", async () => {
    const corps = evenement("payment_intent.created");
    const r = await POST(...requete("A", corps, signer(corps)));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ recu: true, message: "Événement ignoré." });
  });

  it("sans clé de signature pour cet encaisseur : 503", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_B", "");
    const corps = evenement("checkout.session.completed");
    expect((await POST(...requete("B", corps, signer(corps, SECRET_B)))).status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// Retour sur /paiement/merci
// ---------------------------------------------------------------------------

describe("etatSessionCheckout", () => {
  const session = {
    id: SESSION,
    status: "complete",
    payment_status: "paid",
    amount_total: 11_950,
    currency: "eur",
    metadata: { reference: "AN-2026-0142", encaisseur: "A" },
  } as const;

  it.each([
    [{}, { statut: "paye", reference: "AN-2026-0142", centimes: 11_950, moyen: "stripe", identifiant: SESSION }],
    [{ payment_status: "unpaid" }, { statut: "en-cours", reference: "AN-2026-0142", centimes: 11_950 }],
    [{ status: "open", payment_status: "unpaid" }, { statut: "non-paye", reference: "AN-2026-0142" }],
    [{ status: "expired", payment_status: "unpaid" }, { statut: "non-paye", reference: "AN-2026-0142" }],
    [{ metadata: { reference: "AN-2026-0999", encaisseur: "A" } }, { statut: "inconnu", reference: null }],
    [{ metadata: { reference: "AN-2026-0142", encaisseur: "B" } }, { statut: "inconnu", reference: null }],
  ])("état réel de la session (%#)", (modifs, attendu) => {
    expect(etatSessionCheckout({ ...session, ...modifs } as unknown as Stripe.Checkout.Session, "AN-2026-0142", "A")).toEqual(attendu);
  });
});

describe("etatPaiementRetour", () => {
  function deps(session: unknown): DependancesRetour & { retrieve: ReturnType<typeof vi.fn> } {
    const retrieve = vi.fn().mockResolvedValue(session);
    return {
      retrieve,
      stripe: () => ({ checkout: { sessions: { retrieve } } }) as unknown as ClientStripe,
      paypal: () => null,
    };
  }

  it("relit la session chez Stripe avec le client de l'encaisseur", async () => {
    const d = deps({ id: SESSION, status: "complete", payment_status: "paid", amount_total: 11_950, currency: "eur", metadata: { reference: "AN-2026-0142", encaisseur: "A" } });
    await expect(etatPaiementRetour({ ref: "AN-2026-0142", encaisseur: "A", session_id: SESSION }, d)).resolves.toMatchObject({
      statut: "paye",
      centimes: 11_950,
    });
    expect(d.retrieve).toHaveBeenCalledWith(SESSION);
  });

  it("texte générique sans session, sans clé, ou si Stripe ne répond pas", async () => {
    const d = deps(null);
    await expect(etatPaiementRetour({ ref: "AN-2026-0142", encaisseur: "A" }, d)).resolves.toEqual({ statut: "inconnu", reference: "AN-2026-0142" });
    await expect(etatPaiementRetour({ ref: "<script>", encaisseur: "A", session_id: SESSION }, d)).resolves.toEqual({ statut: "inconnu", reference: null });
    await expect(
      etatPaiementRetour({ ref: "AN-2026-0142", encaisseur: "A", session_id: SESSION }, { ...d, stripe: () => null }),
    ).resolves.toEqual({ statut: "inconnu", reference: "AN-2026-0142" });
    d.retrieve.mockRejectedValue(new Error("réseau"));
    await expect(etatPaiementRetour({ ref: "AN-2026-0142", encaisseur: "A", session_id: SESSION }, d)).resolves.toEqual({
      statut: "inconnu",
      reference: "AN-2026-0142",
    });
  });

  it("lit l'état d'une commande PayPal", async () => {
    const d: DependancesRetour = {
      stripe: () => null,
      paypal: async () => ({ statut: "paye", captureId: "3C679366HH908993F", centimes: 11_950, date: new Date() }),
    };
    await expect(
      etatPaiementRetour({ ref: "AN-2026-0142", encaisseur: "B", paypal: "5O190127TN364715T" }, d),
    ).resolves.toEqual({ statut: "paye", reference: "AN-2026-0142", centimes: 11_950, moyen: "paypal", identifiant: "5O190127TN364715T" });
  });
});
