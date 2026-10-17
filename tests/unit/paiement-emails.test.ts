import { afterEach, describe, expect, it, vi } from "vitest";
import { courrielPaiementEchoue, courrielPaiementRecu, montantNotifie, type PaiementNotifie } from "@/lib/encaissement/emails";
import { envoyerCourrielPaiement } from "@/lib/encaissement/envoi";
import { libelleLigne, libelleMoyen } from "@/lib/encaissement/libelles";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

const PAIEMENT: PaiementNotifie = {
  reference: "AN-2026-0142",
  encaisseur: "A",
  centimes: 11_950,
  devise: "eur",
  moyen: "Carte bancaire via Apple Pay (card)",
  date: new Date("2026-10-16T13:42:00Z"),
  prestataire: "Stripe",
  identifiant: "cs_test_a1b2c3",
  test: false,
};

describe("libellés", () => {
  it("ligne du paiement", () => {
    expect(libelleLigne({ libelle: "Le Complet M", ref: "AN-2026-0142" })).toBe("Allée Nette — Le Complet M — réf. AN-2026-0142");
  });

  it.each([
    ["card", null, "Carte bancaire (card)"],
    ["card", "apple_pay", "Carte bancaire via Apple Pay (card)"],
    ["card", "google_pay", "Carte bancaire via Google Pay (card)"],
    ["paypal", null, "PayPal (paypal)"],
    ["twint", null, "twint (twint)"],
    [null, null, "Non précisé (voir le tableau de bord Stripe)"],
  ])("moyen %s / %s → %s", (type, portefeuille, attendu) => {
    expect(libelleMoyen(type, portefeuille)).toBe(attendu);
  });

  it("montant en euros, ou brut dans une autre devise", () => {
    expect(montantNotifie({ centimes: 11_950, devise: "eur" })).toBe("119,50\u00a0€");
    expect(montantNotifie({ centimes: 11_950, devise: "usd" })).toBe("119.50 USD");
    expect(montantNotifie({ centimes: null, devise: "eur" })).toBe("Non précisé");
  });
});

describe("courrielPaiementRecu", () => {
  it("donne la référence, le montant, le moyen de paiement, la date et la session", () => {
    const c = courrielPaiementRecu(PAIEMENT);
    expect(c.objet).toBe("Paiement reçu AN-2026-0142 · 119,50 € · Stripe");
    for (const attendu of [
      "Référence : AN-2026-0142",
      "Montant : 119,50\u00a0€",
      "Moyen de paiement : Carte bancaire via Apple Pay (card)",
      "Date : vendredi 16 octobre 2026 à 15 h 42",
      "Encaissé par : [À COMPLÉTER : nom de l'associé A] (encaisseur A)",
      "Identifiant de la session : cs_test_a1b2c3",
      "Envoyer la facture au client",
    ]) {
      expect(c.texte).toContain(attendu);
    }
    expect(c.html).toContain("cs_test_a1b2c3");
    expect(c.texte).not.toContain("Mode test");
  });

  it("signale le mode test dès l'objet", () => {
    const c = courrielPaiementRecu({ ...PAIEMENT, test: true });
    expect(c.objet).toMatch(/^\[TEST\] Paiement reçu/);
    expect(c.texte).toContain("Mode test : aucun argent réel n'a été encaissé.");
  });

  it("échappe le HTML venu de l'extérieur", () => {
    const c = courrielPaiementRecu({ ...PAIEMENT, moyen: "<img src=x onerror=alert(1)>" });
    expect(c.html).not.toContain("<img src=x");
    expect(c.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("nomme la capture pour PayPal", () => {
    const c = courrielPaiementRecu({ ...PAIEMENT, prestataire: "PayPal", moyen: "PayPal", identifiant: "3C679366HH908993F" });
    expect(c.objet).toBe("Paiement reçu AN-2026-0142 · 119,50 € · PayPal");
    expect(c.texte).toContain("Identifiant de la capture : 3C679366HH908993F");
  });
});

describe("courrielPaiementEchoue", () => {
  it("alerte l'associé et propose la suite", () => {
    const c = courrielPaiementEchoue({ ...PAIEMENT, moyen: "Prélèvement SEPA (sepa_debit)" });
    expect(c.objet).toBe("Paiement échoué AN-2026-0142 · 119,50 €");
    expect(c.texte).toContain("a échoué : rien n'a été encaissé");
    expect(c.texte).toContain("/admin/lien-paiement");
  });
});

describe("envoyerCourrielPaiement", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("hors production sans clé Resend : démonstration, rien ne part", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(envoyerCourrielPaiement("A", courrielPaiementRecu(PAIEMENT), "paiement/cs_test_a1b2c3")).resolves.toBe("demo");
    expect(info.mock.calls.flat().join(" ")).toContain("Paiement reçu AN-2026-0142");
  });

  it("en production sans clé : non configuré (le webhook demandera à Stripe de réessayer)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(envoyerCourrielPaiement("A", courrielPaiementRecu(PAIEMENT), "paiement/cs_test_a1b2c3")).resolves.toBe(
      "non-configure",
    );
  });
});
