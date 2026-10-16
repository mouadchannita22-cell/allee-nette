import { afterEach, describe, expect, it, vi } from "vitest";
import {
  capterSourceVisite,
  domaineReferent,
  extraireSource,
  lireSourceVisite,
  nettoyerSource,
  oublierSourceVisite,
} from "@/lib/source-visite";

describe("source de la visite (partie 14)", () => {
  it("lit les paramètres UTM et le code", () => {
    const source = extraireSource(
      "https://allee-nette.fr/reserver?utm_source=flyer&utm_medium=papier&utm_campaign=lancement&utm_term=lavage&utm_content=verso&code=voisin",
      "",
      "allee-nette.fr",
    );
    expect(source).toEqual({
      utmSource: "flyer",
      utmMedium: "papier",
      utmCampaign: "lancement",
      utmTerm: "lavage",
      utmContent: "verso",
      code: "VOISIN",
    });
  });

  it("la redirection /garage donne code=GARAGE et la source « garage »", () => {
    const source = extraireSource(
      "https://allee-nette.fr/reserver?code=GARAGE&utm_source=garage&utm_medium=qr",
      "",
      "allee-nette.fr",
    );
    expect(source).toEqual({ utmSource: "garage", utmMedium: "qr", code: "GARAGE" });
  });

  it("garde seulement le domaine du site référent, jamais le chemin, et ignore le site lui-même", () => {
    expect(domaineReferent("https://www.google.com/search?q=lavage+saintes", "allee-nette.fr")).toBe("www.google.com");
    expect(domaineReferent("https://www.allee-nette.fr/tarifs", "allee-nette.fr")).toBeUndefined();
    expect(domaineReferent("https://allee-nette.fr/", "www.allee-nette.fr")).toBeUndefined();
    expect(domaineReferent("android-app://com.google.android.gm/", "allee-nette.fr")).toBeUndefined();
    expect(domaineReferent("", "allee-nette.fr")).toBeUndefined();
    expect(extraireSource("https://allee-nette.fr/", "https://l.instagram.com/?u=x", "allee-nette.fr")).toEqual({
      referent: "l.instagram.com",
    });
  });

  it("nettoie ce qui arrive au serveur : clés connues, une ligne, longueur bornée", () => {
    expect(
      nettoyerSource({ utmSource: "a\r\nBcc: x@y.fr", code: "x".repeat(50), inconnu: "z", utmMedium: 3, referent: "  " }),
    ).toEqual({ utmSource: "a Bcc: x@y.fr", code: "X".repeat(20) });
    expect(nettoyerSource("texte")).toEqual({});
    expect(nettoyerSource(null)).toEqual({});
    expect(nettoyerSource({ utmCampaign: "c".repeat(300) }).utmCampaign).toHaveLength(100);
  });
});

describe("mémoire de la visite, sans stockage", () => {
  afterEach(() => {
    oublierSourceVisite();
    vi.unstubAllGlobals();
  });

  it("capte à la première page vue seulement", () => {
    const fenetre = { location: { href: "https://allee-nette.fr/?utm_source=flyer", hostname: "allee-nette.fr" } };
    vi.stubGlobal("window", fenetre);
    vi.stubGlobal("document", { referrer: "https://www.google.com/" });
    capterSourceVisite();
    fenetre.location.href = "https://allee-nette.fr/reserver?utm_source=autre";
    capterSourceVisite();
    expect(lireSourceVisite()).toEqual({ utmSource: "flyer", referent: "www.google.com" });
  });

  it("vide côté serveur", () => {
    capterSourceVisite();
    expect(lireSourceVisite()).toEqual({});
  });
});
