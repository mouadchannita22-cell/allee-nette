import { describe, expect, it } from "vitest";
import {
  DEBIT_PRODUCTION,
  adresseClient,
  attenteAvantEnvoi,
  delaiRespecte,
  lireAntiSpam,
  piegeRempli,
  reglesDebit,
  verifierDebit,
  type MemoireDebit,
} from "@/lib/reservation/anti-spam";

const MINUTE = 60_000;

describe("champ piège (partie 9.3)", () => {
  it("vide pour un humain, rempli par un robot", () => {
    expect(piegeRempli(lireAntiSpam({ piege: "", ouvertLe: 1, envoyeLe: 9_001 }))).toBe(false);
    expect(piegeRempli(lireAntiSpam({ piege: "   " }))).toBe(false);
    expect(piegeRempli(lireAntiSpam({ piege: "https://promo.example" }))).toBe(true);
  });

  it("données absentes ou mal formées : lues sans erreur", () => {
    expect(lireAntiSpam(undefined)).toEqual({ piege: "", ouvertLe: Number.NaN, envoyeLe: Number.NaN });
    expect(lireAntiSpam({ piege: 3, ouvertLe: "1", envoyeLe: Infinity })).toEqual({
      piege: "",
      ouvertLe: Number.NaN,
      envoyeLe: Number.NaN,
    });
  });
});

describe("délai minimal de 8 s", () => {
  const ouvertLe = 1_760_000_000_000;

  it.each([
    [7_999, false],
    [8_000, true],
    [95_000, true],
  ])("envoi %i ms après l'ouverture → %s", (ecart, attendu) => {
    expect(delaiRespecte({ piege: "", ouvertLe, envoyeLe: ouvertLe + ecart })).toBe(attendu);
  });

  it("horodatages manquants ou incohérents : refusé", () => {
    expect(delaiRespecte(lireAntiSpam({}))).toBe(false);
    expect(delaiRespecte({ piege: "", ouvertLe: 0, envoyeLe: 10_000 })).toBe(false);
    expect(delaiRespecte({ piege: "", ouvertLe, envoyeLe: ouvertLe - 10_000 })).toBe(false);
  });

  it("le navigateur attend simplement le temps restant", () => {
    expect(attenteAvantEnvoi(ouvertLe, ouvertLe + 3_000)).toBe(5_000);
    expect(attenteAvantEnvoi(ouvertLe, ouvertLe + 60_000)).toBe(0);
  });
});

describe("limitation du débit en mémoire", () => {
  it("5 demandes par 10 minutes et par adresse, puis 429", () => {
    const memoire: MemoireDebit = new Map();
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(verifierDebit(memoire, "203.0.113.7", t0 + i * MINUTE, DEBIT_PRODUCTION).autorise).toBe(true);
    }
    const refus = verifierDebit(memoire, "203.0.113.7", t0 + 5 * MINUTE, DEBIT_PRODUCTION);
    expect(refus).toEqual({ autorise: false, reessayerDansMs: 5 * MINUTE });
    // Une autre adresse n'est pas concernée.
    expect(verifierDebit(memoire, "198.51.100.2", t0 + 5 * MINUTE, DEBIT_PRODUCTION).autorise).toBe(true);
    // Dix minutes après la première demande, une place se libère.
    expect(verifierDebit(memoire, "203.0.113.7", t0 + 10 * MINUTE + 1, DEBIT_PRODUCTION).autorise).toBe(true);
  });

  it("oublie les adresses inactives quand la mémoire grossit", () => {
    const memoire: MemoireDebit = new Map();
    for (let i = 0; i < 600; i++) verifierDebit(memoire, `10.0.${Math.floor(i / 250)}.${i % 250}`, 0, DEBIT_PRODUCTION);
    verifierDebit(memoire, "203.0.113.7", 11 * MINUTE, DEBIT_PRODUCTION);
    expect(memoire.size).toBe(1);
  });

  it("réglable hors production seulement (tests de bout en bout)", () => {
    expect(reglesDebit(true, "1000")).toEqual(DEBIT_PRODUCTION);
    expect(reglesDebit(false, "1000")).toEqual({ max: 1000, fenetreMs: 10 * MINUTE });
    expect(reglesDebit(false, undefined)).toEqual(DEBIT_PRODUCTION);
    expect(reglesDebit(false, "beaucoup")).toEqual(DEBIT_PRODUCTION);
    expect(reglesDebit(false, "-3")).toEqual(DEBIT_PRODUCTION);
  });

  it("adresse : en-tête Netlify, puis x-forwarded-for", () => {
    expect(
      adresseClient(new Headers({ "x-nf-client-connection-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.2" })),
    ).toBe("203.0.113.7");
    expect(adresseClient(new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
    expect(adresseClient(new Headers())).toBe("inconnue");
  });
});
