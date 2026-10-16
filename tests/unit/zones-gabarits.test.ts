import { describe, expect, it } from "vitest";
import { PREREGLAGES, ZONE_ACTIVE } from "@/config/site";
import { devinerGabarit } from "@/lib/gabarit";
import { rechercherCommunes, trouverCommune, zoneDeCommune } from "@/lib/zones";
import { ETAT_INITIAL, depuisParametres, versParametres, type EtatCalculateur } from "@/lib/devis-url";

const saintes = PREREGLAGES.saintes;

describe("zones (préréglage Saintes)", () => {
  it("la zone active par défaut est Saintes", () => {
    expect(ZONE_ACTIVE).toBe("saintes");
  });

  it.each([
    ["Saintes", "zone1"],
    ["saintes", "zone1"],
    ["  CHANIERS ", "zone1"],
    ["Ecurat", "zone1"],
    ["St Georges des Coteaux", "zone1"],
    ["Saint-Porchaire", "zone2"],
    ["Pons", "zone2"],
    ["Louzac-Saint-André", "zone2"],
    ["Royan", "hors-zone"],
    ["Cognac", "hors-zone"],
    ["", "hors-zone"],
  ] as const)("%s → %s", (saisie, zone) => {
    expect(zoneDeCommune(saisie, saintes)).toBe(zone);
  });

  it("aucune commune n'est à la fois en zone 1 et en zone 2", () => {
    for (const p of Object.values(PREREGLAGES)) {
      const z1 = new Set(p.zone1.map((c) => c.insee));
      expect(p.zone2.filter((c) => z1.has(c.insee))).toEqual([]);
    }
  });

  it("les communes principales citées dans les titres sont bien desservies", () => {
    for (const p of Object.values(PREREGLAGES)) {
      for (const nom of p.communesPrincipales) expect(trouverCommune(nom, p)).not.toBeNull();
    }
  });

  it("autocomplétion : début de nom d'abord, puis milieu", () => {
    const r = rechercherCommunes("sain", 50, saintes).map((c) => c.nom);
    expect(r[0]).toBe("Saintes");
    expect(r).toContain("Saint-Porchaire");
    expect(rechercherCommunes("porch", 10, saintes).map((c) => c.nom)).toEqual(["Saint-Porchaire"]);
    expect(rechercherCommunes("port", 10, saintes).map((c) => c.nom)).toEqual(["Port-d'Envaux"]);
  });

  it("autocomplétion par code postal", () => {
    const r = rechercherCommunes("17100", 50, saintes);
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((c) => c.cp === "17100")).toBe(true);
  });
});

describe("aide « Quel est mon gabarit ? »", () => {
  it.each([
    ["Clio", "S"],
    ["peugeot 208", "S"],
    ["Toyota Yaris", "S"],
    ["Toyota Yaris Cross", "M"],
    ["Golf 7", "M"],
    ["Peugeot 308 SW", "M"],
    ["3008", "M"],
    ["Captur", "M"],
    ["5008", "L"],
    ["Renault Grand Scénic", "L"],
    ["Renault Scénic", "M"],
    ["Citroën Berlingo", "L"],
    ["mercedes classe a", "M"],
  ] as const)("%s → %s", (modele, gabarit) => {
    expect(devinerGabarit(modele)?.gabarit).toBe(gabarit);
  });

  it("modèle inconnu ou saisie trop courte : aucune proposition", () => {
    expect(devinerGabarit("Lada Niva")).toBeNull();
    expect(devinerGabarit("a")).toBeNull();
    // « 2008 » ne doit pas être pris pour une « 208 ».
    expect(devinerGabarit("2008")?.modele).toBe("Peugeot 2008");
  });
});

describe("transmission de l'estimation par l'URL", () => {
  it("aller-retour sans perte", () => {
    const etat: EtatCalculateur = {
      vehicules: [
        { formule: "complet", gabarit: "M", options: { "siege-enfant": 2, "poils-moderes": 1 }, abonnement: true },
        { formule: "interieur-net", gabarit: "S", options: {} },
      ],
      commune: "Chaniers",
      code: "VOISIN",
    };
    expect(depuisParametres(versParametres(etat))).toEqual(etat);
  });

  it("valeurs invalides ignorées", () => {
    const p = new URLSearchParams("f=nimporte&g=XL&o=cuir,inconnue:3&c=Saintes");
    expect(depuisParametres(p)).toEqual({ ...ETAT_INITIAL, commune: "Saintes" });
    const q = new URLSearchParams("f=grand-soin&g=L&o=siege-enfant:abc,cuir");
    expect(depuisParametres(q).vehicules[0]).toEqual({ formule: "grand-soin", gabarit: "L", options: { cuir: 1 } });
  });
});
