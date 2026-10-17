import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site } from "@/config/site";
import {
  lienSmsPaiement,
  lienWhatsAppPaiement,
  lireReponseLien,
  messageLienPaiement,
  suggestionsLibelle,
  telephonePartage,
} from "@/lib/admin/lien-paiement";
import { verifierLien } from "@/lib/paiement";
import { POST } from "@/app/api/admin/lien-paiement/route";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

const MOT_DE_PASSE = "mot-de-passe-de-test";
const SECRET = "secret-de-test-assez-long-pour-signer-0123456789";
const AUTORISATION = `Basic ${btoa(`admin:${MOT_DE_PASSE}`)}`;
const DEMANDE = { ref: "AN-2026-0142", montant: "119,50", libelle: "Le Complet M", encaisseur: "B" };

function requete(corps: unknown, entetes: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/admin/lien-paiement", {
    method: "POST",
    headers: { authorization: AUTORISATION, "content-type": "application/json", "sec-fetch-site": "same-origin", ...entetes },
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
  });
}

describe("POST /api/admin/lien-paiement", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_PASSWORD", MOT_DE_PASSE);
    vi.stubEnv("PAYMENT_LINK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("génère l'URL absolue signée et sa date d'expiration", async () => {
    const avant = Date.now();
    const r = await POST(requete(DEMANDE));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const json = await r.json();
    expect(json).toMatchObject({ ok: true, ref: "AN-2026-0142", centimes: 11_950, libelle: "Le Complet M", encaisseur: "B" });
    expect(json.url).toMatch(new RegExp(`^${site.url}/paiement\\?ref=AN-2026-0142&montant=119\\.50&libelle=Le%20Complet%20M&encaisseur=B&exp=\\d+&sig=`));
    const expireLe = Date.parse(json.expireLe);
    expect(expireLe - avant).toBeGreaterThanOrEqual(7 * 86_400_000 - 1000);
    expect(expireLe - avant).toBeLessThanOrEqual(7 * 86_400_000 + 1000);
    expect(verifierLien(new URL(json.url).searchParams, new Date(), SECRET).valide).toBe(true);
  });

  it("revérifie l'authentification (défense en profondeur)", async () => {
    const sans = await POST(requete(DEMANDE, { authorization: "" }));
    expect(sans.status).toBe(401);
    expect(sans.headers.get("www-authenticate")).toMatch(/^Basic/);
    const mauvais = await POST(requete(DEMANDE, { authorization: `Basic ${btoa("admin:devine")}` }));
    expect(mauvais.status).toBe(401);
    expect(await mauvais.json()).toMatchObject({ ok: false });
  });

  it("ADMIN_PASSWORD absent : 503", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const r = await POST(requete(DEMANDE));
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ ok: false, message: "Administration non configurée." });
  });

  it("données à corriger : 422, un message par champ", async () => {
    const r = await POST(requete({ ref: "AN-2026-", montant: "14,99", libelle: "", encaisseur: "" }));
    expect(r.status).toBe(422);
    const json = await r.json();
    expect(Object.keys(json.champs).sort()).toEqual(["encaisseur", "libelle", "montant", "ref"]);
    expect(json.champs.montant).toBe("Le montant doit être compris entre 15 € et 600 €.");
  });

  it("demande venue d'un autre site : 403", async () => {
    const r = await POST(requete(DEMANDE, { "sec-fetch-site": "cross-site" }));
    expect(r.status).toBe(403);
  });

  it("corps qui n'est pas du JSON : refusé", async () => {
    expect((await POST(requete(DEMANDE, { "content-type": "application/x-www-form-urlencoded" }))).status).toBe(415);
    expect((await POST(requete("{pas du json"))).status).toBe(400);
    expect((await POST(requete("[1,2]"))).status).toBe(400);
    expect((await POST(requete({ ...DEMANDE, libelle: "x".repeat(5_000) }))).status).toBe(413);
  });

  it("PAYMENT_LINK_SECRET absent : 503 explicite, sans secret dans le journal", async () => {
    vi.stubEnv("PAYMENT_LINK_SECRET", "trop-court");
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await POST(requete(DEMANDE));
    expect(r.status).toBe(503);
    expect((await r.json()).message).toMatch(/PAYMENT_LINK_SECRET/);
    expect(journal).toHaveBeenCalledOnce();
    expect(String(journal.mock.calls[0]?.[0])).not.toContain("trop-court");
  });
});

describe("partage du lien", () => {
  const lien = { ref: "AN-2026-0142", centimes: 11_950, url: "https://www.exemple.fr/paiement?ref=AN-2026-0142&sig=abc" };

  it("message type", () => {
    expect(messageLienPaiement(lien)).toBe(
      "Bonjour, voici le lien sécurisé pour régler votre prestation Allée Nette (réf. AN-2026-0142, 119,50 €) : https://www.exemple.fr/paiement?ref=AN-2026-0142&sig=abc Il est valable 7 jours.",
    );
    expect(messageLienPaiement({ ...lien, centimes: 11_900 })).toContain("(réf. AN-2026-0142, 119 €)");
  });

  it("WhatsApp : avec ou sans numéro", () => {
    expect(lienWhatsAppPaiement("Bonjour & merci", "+33612345678")).toBe("https://wa.me/33612345678?text=Bonjour%20%26%20merci");
    expect(lienWhatsAppPaiement("Bonjour", null)).toBe("https://wa.me/?text=Bonjour");
  });

  it("SMS : avec ou sans numéro", () => {
    expect(lienSmsPaiement("Réf. AN-2026-0142 : https://x.fr/?a=1&b=2", "+33612345678")).toBe(
      "sms:+33612345678?&body=R%C3%A9f.%20AN-2026-0142%20%3A%20https%3A%2F%2Fx.fr%2F%3Fa%3D1%26b%3D2",
    );
    expect(lienSmsPaiement("Bonjour", null)).toBe("sms:?&body=Bonjour");
  });

  it("le message complet survit à l'encodage", () => {
    const message = messageLienPaiement(lien);
    const sms = lienSmsPaiement(message, null);
    expect(decodeURIComponent(sms.split("&body=")[1]!)).toBe(message);
    expect(new URL(lienWhatsAppPaiement(message, null)).searchParams.get("text")).toBe(message);
  });

  it("téléphone du client : vide, reconnu ou non", () => {
    expect(telephonePartage("")).toBeNull();
    expect(telephonePartage("  ")).toBeNull();
    expect(telephonePartage("06 12 34 56 78")).toBe("+33612345678");
    expect(telephonePartage("+32 470 12 34 56")).toBe("+32470123456");
    expect(telephonePartage("06 12")).toBe(false);
  });

  it("suggestions : chaque formule pour chaque gabarit, avec le prix de la grille", () => {
    const suggestions = suggestionsLibelle();
    expect(suggestions).toContainEqual({ libelle: "Le Complet M", prix: 119 });
    expect(suggestions).toContainEqual({ libelle: "L'Intérieur Net S", prix: 59 });
    expect(new Set(suggestions.map((s) => s.libelle)).size).toBe(suggestions.length);
    expect(suggestions.every((s) => s.libelle.length <= 80)).toBe(true);
  });
});

describe("lireReponseLien", () => {
  const ok = {
    ok: true,
    url: "https://www.exemple.fr/paiement?ref=AN-2026-0142",
    expireLe: "2026-10-24T10:00:00.000Z",
    ref: "AN-2026-0142",
    centimes: 11_900,
    libelle: "Le Complet M",
    encaisseur: "A",
  };

  it("réponse correcte", () => {
    expect(lireReponseLien(ok, 200)).toEqual(ok);
  });

  it("réponse incomplète ou illisible : message clair", () => {
    expect(lireReponseLien({ ...ok, url: "javascript:alert(1)" }, 200)).toMatchObject({ ok: false });
    expect(lireReponseLien(null, 500)).toEqual({ ok: false, message: "La réponse du serveur est illisible. Réessayez dans un instant." });
  });

  it("identifiants refusés : invite à se reconnecter", () => {
    expect(lireReponseLien({ ok: false, message: "Accès réservé" }, 401)).toEqual({
      ok: false,
      message: "Identifiants refusés : rechargez la page pour vous reconnecter.",
    });
  });

  it("erreurs par champ conservées", () => {
    expect(lireReponseLien({ ok: false, message: "À corriger", champs: { montant: "Trop élevé", autre: 3 } }, 422)).toEqual({
      ok: false,
      message: "À corriger",
      champs: { montant: "Trop élevé" },
    });
  });
});
