import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SecretLienInvalide,
  chaineASigner,
  creerLien,
  normaliserMontant,
  signerLien,
  verifierDonneesLien,
  verifierLien,
  type DonneesLien,
} from "@/lib/paiement";
import { formaterEuros, montantAutorise, montantPourUrl } from "@/lib/montant";
import { genererLienPaiement, liensPaiementConfigures, verifierLienPaiement } from "@/lib/paiement-serveur";
import { site } from "@/config/site";

// Le paquet server-only refuse d'être chargé hors de Next.js.
vi.mock("server-only", () => ({}));

const SECRET = "secret-de-test-assez-long-pour-signer-0123456789";
const MAINTENANT = new Date("2026-10-17T10:00:00Z");
const SEPT_JOURS_S = 7 * 86_400;
const BASE = "https://exemple.test";

const DONNEES: DonneesLien = { ref: "AN-2026-0142", montant: "119", libelle: "Le Complet M", encaisseur: "A" };

/** Paramètres d'un lien relatif. */
function parametres(chemin: string): URLSearchParams {
  return new URL(chemin, BASE).searchParams;
}

/** Lien signé, puis un paramètre remplacé. */
function modifie(cle: string, valeur: string, donnees: DonneesLien = DONNEES): URLSearchParams {
  const p = parametres(signerLien(donnees, MAINTENANT, SECRET));
  p.set(cle, valeur);
  return p;
}

/** Signe à la main, sans les contrôles de signerLien (pour un montant hors limites, par exemple). */
function signatureManuelle(champs: { ref: string; centimes: number; libelle: string; encaisseur: "A" | "B"; exp: number }) {
  return createHmac("sha256", SECRET).update(chaineASigner(champs), "utf8").digest("base64url");
}

describe("normaliserMontant", () => {
  it.each([
    ["119", 11_900],
    ["119.0", 11_900],
    ["119.00", 11_900],
    ["119.5", 11_950],
    ["119.50", 11_950],
    ["119,50", 11_950],
    [" 15 ", 1_500],
    ["600", 60_000],
    ["0.07", 7],
  ])("« %s » → %i centimes", (saisie, centimes) => {
    expect(normaliserMontant(saisie)).toBe(centimes);
  });

  it("accepte un nombre, sans erreur d'arrondi", () => {
    expect(normaliserMontant(119.5)).toBe(11_950);
    expect(normaliserMontant(0.29)).toBe(29);
    expect(normaliserMontant(119)).toBe(11_900);
  });

  it.each(["", "abc", "cent dix-neuf", "-20", "+20", "119.505", "119.", ".5", "1 000", "1e3", "12€", "0x10"])(
    "refuse « %s »",
    (saisie) => {
      expect(normaliserMontant(saisie)).toBeNull();
    },
  );

  it("refuse les nombres non finis ou négatifs", () => {
    expect(normaliserMontant(Number.NaN)).toBeNull();
    expect(normaliserMontant(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normaliserMontant(-5)).toBeNull();
  });
});

describe("bornes et affichage des montants", () => {
  it.each([
    [1_499, false],
    [1_500, true],
    [11_900, true],
    [60_000, true],
    [60_001, false],
    [-11_900, false],
  ])("%i centimes autorisés → %s", (centimes, attendu) => {
    expect(montantAutorise(centimes)).toBe(attendu);
  });

  it("forme canonique dans l'URL et affichage français", () => {
    expect(montantPourUrl(11_900)).toBe("119");
    expect(montantPourUrl(11_950)).toBe("119.50");
    expect(montantPourUrl(1_505)).toBe("15.05");
    expect(formaterEuros(11_950)).toBe("119,50 €");
    expect(formaterEuros(11_900, " ")).toBe("119 €");
  });
});

describe("chaineASigner", () => {
  it("préfixe de version, puis une valeur par ligne", () => {
    expect(
      chaineASigner({ ref: "AN-2026-0142", centimes: 11_900, libelle: "Le Complet M", encaisseur: "A", exp: 1_761_300_000 }),
    ).toBe("v1\nAN-2026-0142\n11900\nLe Complet M\nA\n1761300000");
  });

  it("refuse un libellé qui contient un retour à la ligne (chaîne ambiguë)", () => {
    expect(() =>
      chaineASigner({ ref: "AN-2026-0142", centimes: 11_900, libelle: "Le Complet\nA", encaisseur: "A", exp: 1 }),
    ).toThrow(TypeError);
  });
});

describe("signerLien", () => {
  it("lien relatif, paramètres dans l'ordre, valable 7 jours", () => {
    const chemin = signerLien(DONNEES, MAINTENANT, SECRET);
    const exp = Math.floor(MAINTENANT.getTime() / 1000) + SEPT_JOURS_S;
    expect(chemin).toMatch(
      new RegExp(`^/paiement\\?ref=AN-2026-0142&montant=119&libelle=Le%20Complet%20M&encaisseur=A&exp=${exp}&sig=[\\w-]{43}$`),
    );
  });

  it("« 119 », « 119.00 », « 119,00 » et 119 signent pareil", () => {
    const reference = signerLien(DONNEES, MAINTENANT, SECRET);
    for (const montant of ["119.00", "119,00", "119.0", 119]) {
      expect(signerLien({ ...DONNEES, montant }, MAINTENANT, SECRET)).toBe(reference);
    }
  });

  it("le même lien reçu avec « montant=119.00 » reste valable", () => {
    expect(verifierLien(modifie("montant", "119.00"), MAINTENANT, SECRET).valide).toBe(true);
  });

  it("normalise la saisie : référence en majuscules, espaces, forme Unicode composée", () => {
    const lien = creerLien(
      { ref: " an-2026-0142 ", montant: "119,5", libelle: "  L'Intérieur   Net  S ", encaisseur: "B" },
      MAINTENANT,
      SECRET,
    );
    expect(lien).toMatchObject({ ref: "AN-2026-0142", centimes: 11_950, libelle: "L'Intérieur Net S", encaisseur: "B" });
    expect(parametres(lien.chemin).get("montant")).toBe("119.50");
  });

  it("refuse de signer des données invalides", () => {
    for (const montant of ["14.99", "600.01", "-119", "texte"]) {
      expect(() => signerLien({ ...DONNEES, montant }, MAINTENANT, SECRET)).toThrow(RangeError);
    }
    expect(() => signerLien({ ...DONNEES, ref: "AN-26-1" }, MAINTENANT, SECRET)).toThrow(RangeError);
    expect(() => signerLien({ ...DONNEES, libelle: "  " }, MAINTENANT, SECRET)).toThrow(RangeError);
    expect(() => signerLien({ ...DONNEES, encaisseur: "C" as "A" }, MAINTENANT, SECRET)).toThrow(RangeError);
  });
});

describe("verifierLien", () => {
  it("signature valide : lien accepté, avec ses champs", () => {
    const chemin = signerLien(DONNEES, MAINTENANT, SECRET);
    const resultat = verifierLien(parametres(chemin), MAINTENANT, SECRET);
    expect(resultat).toEqual({
      valide: true,
      lien: {
        ref: "AN-2026-0142",
        centimes: 11_900,
        libelle: "Le Complet M",
        encaisseur: "A",
        exp: Math.floor(MAINTENANT.getTime() / 1000) + SEPT_JOURS_S,
        sig: parametres(chemin).get("sig"),
        chemin,
      },
    });
  });

  it("accepte aussi les searchParams d'une page Next.js (objet)", () => {
    const objet = Object.fromEntries(parametres(signerLien(DONNEES, MAINTENANT, SECRET)));
    expect(verifierLien(objet, MAINTENANT, SECRET).valide).toBe(true);
  });

  it("signature falsifiée : refusée", () => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    const sig = p.get("sig")!;
    p.set("sig", `${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`);
    expect(verifierLien(p, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "signature" });
  });

  it("signature d'un autre secret : refusée", () => {
    const chemin = signerLien(DONNEES, MAINTENANT, `${SECRET}-autre`);
    expect(verifierLien(parametres(chemin), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "signature" });
  });

  it.each([
    ["ref", "AN-2026-0143"],
    ["montant", "120"],
    ["montant", "119.01"],
    ["libelle", "Le Complet L"],
    ["libelle", "Le Complet m"],
    ["encaisseur", "B"],
  ])("%s modifié après signature (%s) : refusé", (cle, valeur) => {
    expect(verifierLien(modifie(cle, valeur), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "signature" });
  });

  it("expiration repoussée après signature : refusée", () => {
    const exp = Number(parametres(signerLien(DONNEES, MAINTENANT, SECRET)).get("exp"));
    expect(verifierLien(modifie("exp", String(exp + 1)), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "signature" });
    expect(verifierLien(modifie("exp", String(exp + 30 * 86_400)), MAINTENANT, SECRET)).toEqual({
      valide: false,
      raison: "signature",
    });
  });

  it("lien expiré : refusé à 7 jours pile, accepté une seconde avant", () => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    const fin = Number(p.get("exp")) * 1000;
    expect(verifierLien(p, new Date(fin - 1000), SECRET).valide).toBe(true);
    expect(verifierLien(p, new Date(fin), SECRET)).toEqual({ valide: false, raison: "expire" });
    expect(verifierLien(p, new Date(fin + 86_400_000), SECRET)).toEqual({ valide: false, raison: "expire" });
  });

  it("lien expiré dont on change la date : refusé pour sa signature", () => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    const plusTard = new Date(MAINTENANT.getTime() + 10 * 86_400_000);
    p.set("exp", String(Math.floor(plusTard.getTime() / 1000) + 3600));
    expect(verifierLien(p, plusTard, SECRET)).toEqual({ valide: false, raison: "signature" });
  });

  it.each([
    ["14.99", 1_499],
    ["600.01", 60_001],
    ["5", 500],
  ])("montant hors limites, même correctement signé (%s €) : refusé", (montant, centimes) => {
    const exp = Math.floor(MAINTENANT.getTime() / 1000) + SEPT_JOURS_S;
    const champs = { ref: "AN-2026-0142", centimes, libelle: "Le Complet M", encaisseur: "A" as const, exp };
    const p = new URLSearchParams({
      ref: champs.ref,
      montant,
      libelle: champs.libelle,
      encaisseur: "A",
      exp: String(exp),
      sig: signatureManuelle(champs),
    });
    expect(verifierLien(p, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "montant" });
  });

  it.each(["-119", "texte", "", "119.505", "1e2"])("montant illisible (« %s ») : refusé", (montant) => {
    expect(verifierLien(modifie("montant", montant), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "montant" });
  });

  it("bornes comprises : 15 € et 600 € sont acceptés", () => {
    for (const montant of ["15", "600", "600.00"]) {
      const chemin = signerLien({ ...DONNEES, montant }, MAINTENANT, SECRET);
      expect(verifierLien(parametres(chemin), MAINTENANT, SECRET).valide).toBe(true);
    }
  });

  it("caractères spéciaux et accents dans le libellé", () => {
    const libelle = "L'Intérieur Net — S & co, 50 % / #2 ?=+ (déjà payé : non) « été » 🚗";
    const chemin = signerLien({ ...DONNEES, libelle }, MAINTENANT, SECRET);
    // Rien qui coupe le lien dans une messagerie ou casse la requête.
    expect(chemin.split("?")[1]).not.toMatch(/[ '()!*#+]|&(?!(?:montant|libelle|encaisseur|exp|sig)=)/);
    const resultat = verifierLien(parametres(chemin), MAINTENANT, SECRET);
    expect(resultat.valide && resultat.lien.libelle).toBe(libelle);
  });

  it("libellé accentué reçu sous une autre forme Unicode : refusé", () => {
    const chemin = signerLien({ ...DONNEES, libelle: "L'Intérieur Net S" }, MAINTENANT, SECRET);
    const p = parametres(chemin);
    p.set("libelle", "L'Intérieur Net S".normalize("NFD"));
    expect(verifierLien(p, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
  });

  it("paramètres inconnus ajoutés par une messagerie : ignorés", () => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    p.set("fbclid", "IwAR0abc");
    p.set("utm_source", "whatsapp");
    expect(verifierLien(p, MAINTENANT, SECRET).valide).toBe(true);
  });

  it.each(["ref", "montant", "libelle", "encaisseur", "exp", "sig"])("paramètre « %s » absent : refusé", (cle) => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    p.delete(cle);
    expect(verifierLien(p, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
  });

  it("paramètre répété (lien ambigu) : refusé", () => {
    const p = parametres(signerLien(DONNEES, MAINTENANT, SECRET));
    p.append("montant", "15");
    expect(verifierLien(p, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
    const objet = { ...Object.fromEntries(p), montant: ["119", "15"] };
    expect(verifierLien(objet, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
  });

  it.each([
    ["ref", "AN-26-0142"],
    ["ref", "an-2026-0142"],
    ["encaisseur", "C"],
    ["encaisseur", "a"],
    ["exp", "demain"],
    ["exp", "-1"],
    ["sig", "trop-courte"],
    ["libelle", ""],
    ["libelle", " Le Complet M"],
    ["libelle", "Le Complet\u0000M"],
    ["libelle", "x".repeat(81)],
  ])("%s mal formé (%j) : refusé", (cle, valeur) => {
    expect(verifierLien(modifie(cle, valeur), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
  });

  it("aucun paramètre : refusé", () => {
    expect(verifierLien(new URLSearchParams(), MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
    expect(verifierLien({}, MAINTENANT, SECRET)).toEqual({ valide: false, raison: "format" });
  });
});

describe("absence de secret", () => {
  it.each([undefined, "", "   ", "trop-court-31-caracteres-012345"])("secret %j : erreur claire, sans le secret", (secret) => {
    expect(() => signerLien(DONNEES, MAINTENANT, secret)).toThrow(SecretLienInvalide);
    expect(() => verifierLien(new URLSearchParams(), MAINTENANT, secret)).toThrow(/PAYMENT_LINK_SECRET.*32 caractères/);
    try {
      signerLien(DONNEES, MAINTENANT, secret);
    } catch (erreur) {
      if (secret?.trim()) expect((erreur as Error).message).not.toContain(secret);
    }
  });

  it("32 caractères suffisent", () => {
    expect(() => signerLien(DONNEES, MAINTENANT, "x".repeat(32))).not.toThrow();
  });
});

describe("verifierDonneesLien (administration)", () => {
  it("données correctes : normalisées", () => {
    expect(verifierDonneesLien({ ref: "an-2026-0007", montant: "79,5", libelle: " L'Intérieur Net  L ", encaisseur: "B" })).toEqual({
      ok: true,
      donnees: { ref: "AN-2026-0007", centimes: 7_950, libelle: "L'Intérieur Net L", encaisseur: "B" },
    });
  });

  it("un message clair par champ", () => {
    const resultat = verifierDonneesLien({ ref: "AN-2026-", montant: "700", libelle: "", encaisseur: "C" });
    expect(resultat).toEqual({
      ok: false,
      erreurs: {
        ref: "Indiquez la référence de la demande, au format AN-2026-0142.",
        montant: "Le montant doit être compris entre 15 € et 600 €.",
        libelle: "Indiquez la prestation, par exemple « Le Complet M ».",
        encaisseur: "Choisissez qui encaisse : A ou B.",
      },
    });
  });

  it("montant illisible, libellé trop long ou avec un caractère de contrôle", () => {
    const r1 = verifierDonneesLien({ ...DONNEES, montant: "cent" });
    expect(!r1.ok && r1.erreurs.montant).toBe("Indiquez le montant en euros, par exemple 119 ou 119,50.");
    const r2 = verifierDonneesLien({ ...DONNEES, libelle: "é".repeat(81) });
    expect(!r2.ok && r2.erreurs.libelle).toMatch(/80 caractères/);
    expect(verifierDonneesLien({ ...DONNEES, libelle: "é".repeat(80) }).ok).toBe(true);
    const r3 = verifierDonneesLien({ ...DONNEES, libelle: "Le Complet\u0007" });
    expect(!r3.ok && r3.erreurs.libelle).toMatch(/caractère non autorisé/);
    const r4 = verifierDonneesLien({ ...DONNEES, libelle: "Le Complet \ud800" });
    expect(!r4.ok && r4.erreurs.libelle).toMatch(/caractère non autorisé/);
  });

  it("valeurs d'un mauvais type : refusées sans erreur", () => {
    expect(verifierDonneesLien({ ref: 42, montant: {}, libelle: null, encaisseur: undefined }).ok).toBe(false);
  });
});

describe("couche serveur (PAYMENT_LINK_SECRET)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("génère une URL absolue sur l'adresse du site, avec la date d'expiration", () => {
    vi.stubEnv("PAYMENT_LINK_SECRET", SECRET);
    expect(liensPaiementConfigures()).toBe(true);
    const { url, expireLe } = genererLienPaiement(DONNEES, MAINTENANT);
    expect(url.startsWith(`${site.url}/paiement?ref=AN-2026-0142&`)).toBe(true);
    expect(expireLe.getTime()).toBe(MAINTENANT.getTime() + SEPT_JOURS_S * 1000);
    expect(verifierLienPaiement(new URL(url).searchParams, MAINTENANT).valide).toBe(true);
  });

  it("sans secret : génération impossible, vérification « configuration » journalisée sans fuite", () => {
    vi.stubEnv("PAYMENT_LINK_SECRET", "");
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(liensPaiementConfigures()).toBe(false);
    expect(() => genererLienPaiement(DONNEES, MAINTENANT)).toThrow(SecretLienInvalide);
    expect(verifierLienPaiement(new URLSearchParams(), MAINTENANT)).toEqual({ valide: false, raison: "configuration" });
    expect(journal).toHaveBeenCalledOnce();
  });
});
