import { afterEach, describe, expect, it, vi } from "vitest";
import { contexteDeploiement, enProduction } from "@/lib/environnement";
import {
  FORMAT_REFERENCE,
  formaterReference,
  incrementerCompteur,
  nomMagasinReferences,
  obtenirReference,
  referenceSecours,
  type MagasinCompteur,
} from "@/lib/reservation/reference";

/** Magasin Blobs factice, avec écriture conditionnelle par etag. */
function magasinFactice(options: { avantEcriture?: (cle: string) => void; erreurServeur?: number } = {}) {
  const donnees = new Map<string, { valeur: unknown; etag: string }>();
  let version = 0;
  let erreursRestantes = options.erreurServeur ?? 0;
  const magasin: MagasinCompteur = {
    async getWithMetadata(cle) {
      const e = donnees.get(cle);
      return e ? { data: e.valeur, etag: e.etag } : null;
    },
    async setJSON(cle, valeur, conditions) {
      options.avantEcriture?.(cle);
      if (erreursRestantes > 0) {
        erreursRestantes--;
        // Ce que renvoie @netlify/blobs après une erreur 5xx finale en écriture conditionnelle.
        return { modified: true, etag: "" };
      }
      const e = donnees.get(cle);
      const refuse = "onlyIfNew" in conditions ? e !== undefined : e?.etag !== conditions.onlyIfMatch;
      if (refuse) return { modified: false };
      const etag = `"v${++version}"`;
      donnees.set(cle, { valeur, etag });
      return { modified: true, etag };
    },
  };
  return { magasin, donnees };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("format de la référence AN-AAAA-NNNN (partie 9.3)", () => {
  it("quatre chiffres, complétés par des zéros", () => {
    expect(formaterReference(2026, 42)).toBe("AN-2026-0042");
    expect(formaterReference(2026, 9999)).toBe("AN-2026-9999");
    expect(FORMAT_REFERENCE.test(formaterReference(2027, 1))).toBe(true);
  });

  it.each([0, 10000, 1.5, -1])("numéro %s refusé", (n) => {
    expect(() => formaterReference(2026, n)).toThrow(RangeError);
  });

  it("référence de secours : même format, numéro 9xxx dérivé de l'horodatage", () => {
    const r = referenceSecours(new Date("2026-10-16T13:00:42Z"));
    expect(r).toMatch(/^AN-2026-9\d{3}$/);
    expect(referenceSecours(new Date("2026-12-31T23:30:00Z"))).toMatch(/^AN-2027-9\d{3}$/);
  });
});

describe("magasin Netlify Blobs propre au contexte", () => {
  it.each([
    ["production", "references"],
    ["deploy-preview", "references-apercu"],
    ["branch-deploy", "references-apercu"],
    ["dev", "references-apercu"],
    ["", "references-apercu"],
  ])("%s → %s", (contexte, nom) => {
    expect(nomMagasinReferences(contexte)).toBe(nom);
  });

  it("contexte recopié au build dans CONTEXTE_DEPLOIEMENT", () => {
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "deploy-preview");
    expect(contexteDeploiement()).toBe("deploy-preview");
    expect(enProduction()).toBe(false);
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "production");
    expect(enProduction()).toBe(true);
  });
});

describe("compteur annuel par écriture conditionnelle", () => {
  it("première demande de l'année : 1, puis 2, une clé par année", async () => {
    const { magasin, donnees } = magasinFactice();
    expect(await incrementerCompteur(magasin, 2026)).toBe(1);
    expect(await incrementerCompteur(magasin, 2026)).toBe(2);
    expect(await incrementerCompteur(magasin, 2027)).toBe(1);
    expect([...donnees.entries()].map(([cle, e]) => [cle, e.valeur])).toEqual([
      ["2026", 2],
      ["2027", 1],
    ]);
  });

  it("demandes simultanées : chacune obtient un numéro différent", async () => {
    const { magasin } = magasinFactice();
    const numeros = await Promise.all(Array.from({ length: 5 }, () => incrementerCompteur(magasin, 2026)));
    expect([...numeros].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("une écriture concurrente entre la lecture et l'écriture : nouvelle tentative", async () => {
    let interventions = 1;
    const { magasin, donnees } = magasinFactice({
      avantEcriture: (cle) => {
        if (interventions-- > 0) donnees.set(cle, { valeur: 7, etag: '"autre"' });
      },
    });
    expect(await incrementerCompteur(magasin, 2026)).toBe(8);
  });

  it("une erreur serveur (modifié sans etag) n'est pas prise pour une réussite", async () => {
    const { magasin } = magasinFactice({ erreurServeur: 1 });
    expect(await incrementerCompteur(magasin, 2026)).toBe(1);
  });

  it("compteur illisible ou toujours occupé : erreur", async () => {
    const { magasin, donnees } = magasinFactice();
    donnees.set("2026", { valeur: "abc", etag: '"x"' });
    await expect(incrementerCompteur(magasin, 2026)).rejects.toThrow("illisible");
    const occupe = magasinFactice({ avantEcriture: () => occupe.donnees.set("2026", { valeur: 1, etag: `"${Math.random()}"` }) });
    await expect(incrementerCompteur(occupe.magasin, 2026, 3)).rejects.toThrow("occupé");
  });
});

describe("obtenirReference", () => {
  it("avec Netlify Blobs : AN-année de Paris-numéro du compteur", async () => {
    const { magasin } = magasinFactice();
    const nouvelAn = new Date("2026-12-31T23:30:00Z");
    expect(await obtenirReference(nouvelAn, () => magasin)).toEqual({ reference: "AN-2027-0001", secours: false });
    expect(await obtenirReference(nouvelAn, () => magasin)).toEqual({ reference: "AN-2027-0002", secours: false });
  });

  it("hors Netlify (local, tests) : compteur en mémoire", async () => {
    const date = new Date("2031-03-01T10:00:00Z");
    const premiere = await obtenirReference(date);
    const seconde = await obtenirReference(date);
    expect(premiere).toEqual({ reference: "AN-2031-0001", secours: false });
    expect(seconde).toEqual({ reference: "AN-2031-0002", secours: false });
  });

  it("Blobs en échec : référence de secours signalée, sans lever d'erreur", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const casse: MagasinCompteur = {
      getWithMetadata: () => Promise.reject(new Error("BlobsInternalError")),
      setJSON: () => Promise.reject(new Error("BlobsInternalError")),
    };
    const r = await obtenirReference(new Date("2026-10-16T13:00:00Z"), () => casse);
    expect(r.secours).toBe(true);
    expect(r.reference).toMatch(/^AN-2026-9\d{3}$/);
  });

  it("en production, Blobs absent n'est pas remplacé par la mémoire : secours", async () => {
    vi.stubEnv("CONTEXTE_DEPLOIEMENT", "production");
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await obtenirReference(new Date("2026-10-16T13:00:00Z"));
    expect(r.secours).toBe(true);
    expect(journal).toHaveBeenCalledWith(expect.stringContaining("MissingBlobsEnvironmentError"));
  });
});
