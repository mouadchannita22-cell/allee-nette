import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import {
  egauxEnTempsConstant,
  lireIdentifiants,
  reponseRefus,
  verifierAuthentification,
} from "@/lib/admin/authentification";
import { config, proxy } from "@/proxy";

const MOT_DE_PASSE = "mot-de-passe-de-test:avec-deux-points";

/** En-tête « Authorization: Basic … » (UTF-8, comme les navigateurs actuels). */
function basic(identifiant: string, motDePasse: string): string {
  return `Basic ${Buffer.from(`${identifiant}:${motDePasse}`, "utf8").toString("base64")}`;
}

describe("lireIdentifiants", () => {
  it("lit l'identifiant et le mot de passe, « : » compris dans le mot de passe", () => {
    expect(lireIdentifiants(basic("admin", "a:b:c"))).toEqual({ identifiant: "admin", motDePasse: "a:b:c" });
    expect(lireIdentifiants(basic("", "seul"))).toEqual({ identifiant: "", motDePasse: "seul" });
  });

  it("décode l'UTF-8 (accents)", () => {
    expect(lireIdentifiants(basic("élise", "café-crème"))).toEqual({ identifiant: "élise", motDePasse: "café-crème" });
  });

  it("accepte « basic » en minuscules", () => {
    expect(lireIdentifiants(basic("admin", "x").replace("Basic", "basic"))?.motDePasse).toBe("x");
  });

  it.each([null, undefined, "", "Basic", "Basic ", "Bearer abc", "Basic !!!", `Basic ${btoa("sans-deux-points")}`])(
    "en-tête absent ou illisible (%j) : null",
    (entete) => {
      expect(lireIdentifiants(entete)).toBeNull();
    },
  );
});

describe("egauxEnTempsConstant", () => {
  it("compare les empreintes SHA-256", async () => {
    expect(await egauxEnTempsConstant("abc", "abc")).toBe(true);
    expect(await egauxEnTempsConstant("", "")).toBe(true);
    expect(await egauxEnTempsConstant("abc", "abd")).toBe(false);
    expect(await egauxEnTempsConstant("abc", "abcd")).toBe(false);
    expect(await egauxEnTempsConstant("abc", "")).toBe(false);
  });
});

describe("verifierAuthentification", () => {
  it("ADMIN_PASSWORD absent ou vide : non configuré, même avec des identifiants", async () => {
    for (const attendu of [undefined, "", "   "]) {
      expect(await verifierAuthentification(basic("admin", "x"), attendu)).toBe("non-configure");
      expect(await verifierAuthentification(null, attendu)).toBe("non-configure");
    }
  });

  it("en-tête absent : refusé", async () => {
    expect(await verifierAuthentification(null, MOT_DE_PASSE)).toBe("refuse");
  });

  it("mauvais mot de passe : refusé", async () => {
    expect(await verifierAuthentification(basic("admin", "mauvais"), MOT_DE_PASSE)).toBe("refuse");
    expect(await verifierAuthentification(basic("admin", `${MOT_DE_PASSE} `), MOT_DE_PASSE)).toBe("refuse");
    expect(await verifierAuthentification(basic("admin", ""), MOT_DE_PASSE)).toBe("refuse");
  });

  it("bon mot de passe : autorisé, quel que soit l'identifiant", async () => {
    expect(await verifierAuthentification(basic("admin", MOT_DE_PASSE), MOT_DE_PASSE)).toBe("autorise");
    expect(await verifierAuthentification(basic("associe-b", MOT_DE_PASSE), MOT_DE_PASSE)).toBe("autorise");
  });

  it("espaces autour de la variable ignorés (copier-coller dans Netlify)", async () => {
    expect(await verifierAuthentification(basic("admin", MOT_DE_PASSE), ` ${MOT_DE_PASSE}\n`)).toBe("autorise");
  });
});

describe("reponseRefus", () => {
  it("401 : demande d'identifiants, jamais en cache ni indexée", async () => {
    const r = reponseRefus("refuse", "texte");
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toBe('Basic realm="Administration Allee Nette", charset="UTF-8"');
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await r.text()).toMatch(/Accès réservé/);
  });

  it("503 sans demande d'identifiants, en JSON pour l'API", async () => {
    const r = reponseRefus("non-configure", "json");
    expect(r.status).toBe(503);
    expect(r.headers.get("www-authenticate")).toBeNull();
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.json()).toEqual({ ok: false, message: "Administration non configurée." });
  });
});

describe("proxy (authentification Basic)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const requete = (chemin: string, authorization?: string) =>
    new NextRequest(`http://localhost:3000${chemin}`, { headers: authorization ? { authorization } : {} });

  it("en-tête absent : 401 avec demande d'identifiants", async () => {
    vi.stubEnv("ADMIN_PASSWORD", MOT_DE_PASSE);
    const r = await proxy(requete("/admin/lien-paiement"));
    expect(r.status).toBe(401);
    expect(r.headers.get("www-authenticate")).toMatch(/^Basic realm=/);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-middleware-next")).toBeNull();
  });

  it("mauvais mot de passe : 401", async () => {
    vi.stubEnv("ADMIN_PASSWORD", MOT_DE_PASSE);
    const r = await proxy(requete("/admin/lien-paiement", basic("admin", "devine")));
    expect(r.status).toBe(401);
  });

  it("bon mot de passe : la requête continue, sans cache", async () => {
    vi.stubEnv("ADMIN_PASSWORD", MOT_DE_PASSE);
    const r = await proxy(requete("/admin/lien-paiement", basic("admin", MOT_DE_PASSE)));
    expect(r.status).toBe(200);
    expect(r.headers.get("x-middleware-next")).toBe("1");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("ADMIN_PASSWORD absent : 503 « Administration non configurée », jamais d'accès ouvert", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const page = await proxy(requete("/admin/lien-paiement", basic("admin", "")));
    expect(page.status).toBe(503);
    expect(await page.text()).toBe("Administration non configurée.");
    expect(page.headers.get("x-middleware-next")).toBeNull();
    const api = await proxy(requete("/api/admin/lien-paiement"));
    expect(api.status).toBe(503);
    expect(await api.json()).toEqual({ ok: false, message: "Administration non configurée." });
  });

  it("API : refus en JSON", async () => {
    vi.stubEnv("ADMIN_PASSWORD", MOT_DE_PASSE);
    const r = await proxy(requete("/api/admin/lien-paiement"));
    expect(r.status).toBe(401);
    expect(r.headers.get("content-type")).toMatch(/application\/json/);
  });

  it.each([
    ["/admin", true],
    ["/admin/lien-paiement", true],
    ["/admin/autre/page", true],
    ["/api/admin/lien-paiement", true],
    ["/administration", false],
    ["/paiement", false],
    ["/api/reservation", false],
    ["/", false],
  ])("le proxy s'applique à %s : %s", (url, attendu) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(attendu);
  });
});
