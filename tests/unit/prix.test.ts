import { describe, expect, it } from "vitest";
import { OFFRES, prixAbonnement } from "@/data/offres";
import {
  MESSAGE_HORS_ZONE,
  MESSAGE_METEO,
  MESSAGE_ZONE_2,
  basculerOption,
  calculerDevis,
  disponibilite,
  nettoyerOptions,
  type EntreeDevis,
  type ResultatDevis,
} from "@/lib/prix";

/** Calcule et vérifie qu'il s'agit bien d'une estimation chiffrée. */
function estimation(entree: EntreeDevis) {
  const r = calculerDevis(entree);
  if (r.statut !== "estimation") throw new Error(`Estimation attendue, obtenu « ${r.statut} »`);
  return r;
}

function statut(r: ResultatDevis) {
  return r.statut;
}

describe("cas obligatoires du brief (partie 8)", () => {
  it("Le Complet, M, zone 1, sans option : 119 €", () => {
    expect(estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone1" }).total).toBe(119);
  });

  it("L'Intérieur Net, S, poils modérés, 2 sièges enfants : 59 + 25 + 30 = 114 €", () => {
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { "poils-moderes": 1, "siege-enfant": 2 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(114);
    expect(r.lignes.filter((l) => l.type === "option").map((l) => l.montant)).toEqual([25, 30]);
  });

  it("Le Grand Soin, L, désodorisation : option refusée (incluse), total 139 €", () => {
    const r = estimation({
      vehicules: [{ formule: "grand-soin", gabarit: "L", options: { desodorisation: 1 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(139);
    expect(r.optionsRefusees).toEqual([
      { vehicule: 0, option: "desodorisation", raison: "Déjà incluse dans Le Grand Soin" },
    ]);
  });

  it("Le Complet, M, zone 2 : 129 €", () => {
    expect(estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone2" }).total).toBe(129);
  });

  it("L'Intérieur Net, M, zone 2 : refusé, avec le message de zone 2", () => {
    const r = calculerDevis({ vehicules: [{ formule: "interieur-net", gabarit: "M" }], zone: "zone2" });
    expect(r).toEqual({
      statut: "refuse",
      motif: "zone2-formule",
      message: MESSAGE_ZONE_2,
      formulesProposees: ["complet", "grand-soin"],
    });
    expect(MESSAGE_ZONE_2).toBe("En zone 2, choisissez Le Complet ou Le Grand Soin");
  });

  it("Abonnement Le Complet, M : 107 €", () => {
    expect(
      estimation({ vehicules: [{ formule: "complet", gabarit: "M", abonnement: true }], zone: "zone1" }).total,
    ).toBe(107);
  });

  it("Prêt à vendre, M : 139 €", () => {
    expect(estimation({ vehicules: [{ formule: "pret-a-vendre", gabarit: "M" }], zone: "zone1" }).total).toBe(139);
  });

  it("Deux voitures à la même adresse, Le Complet M + L'Intérieur Net S : 119 + 59 − 15 = 163 €", () => {
    const r = estimation({
      vehicules: [
        { formule: "complet", gabarit: "M" },
        { formule: "interieur-net", gabarit: "S" },
      ],
      zone: "zone1",
    });
    expect(r.total).toBe(163);
    expect(r.lignes.find((l) => l.type === "remise")?.montant).toBe(-15);
  });

  it("shampooing des sièges avant + des cinq sièges : impossible de cocher les deux", () => {
    const r = calculerDevis({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { "shampooing-avant": 1, "shampooing-cinq": 1 } }],
      zone: "zone1",
    });
    expect(r.statut).toBe("invalide");
    // Dans l'interface, cocher l'une décoche l'autre.
    expect(basculerOption({ "shampooing-avant": 1 }, "shampooing-cinq", 1)).toEqual({ "shampooing-cinq": 1 });
    expect(basculerOption({ "shampooing-cinq": 1 }, "shampooing-avant", 1)).toEqual({ "shampooing-avant": 1 });
  });
});

describe("abonnements : −10 % arrondi à l'euro inférieur, conforme à la grille du brief", () => {
  it.each([
    ["complet", "S", 98],
    ["complet", "M", 107],
    ["complet", "L", 116],
    ["interieur-net", "S", 53],
    ["interieur-net", "M", 62],
    ["interieur-net", "L", 71],
  ] as const)("%s %s : %i €", (formule, gabarit, attendu) => {
    expect(prixAbonnement(formule, gabarit)).toBe(attendu);
  });

  it("un abonnement demandé sur une formule qui n'en a pas garde le prix normal, avec un avertissement", () => {
    const r = estimation({ vehicules: [{ formule: "grand-soin", gabarit: "M", abonnement: true }], zone: "zone1" });
    expect(r.total).toBe(119);
    expect(r.avertissements.map((a) => a.code)).toContain("abonnement-indisponible");
  });

  it("la remise d'abonnement ne porte que sur la formule, pas sur les options", () => {
    const r = estimation({
      vehicules: [{ formule: "complet", gabarit: "M", abonnement: true, options: { "poils-importants": 1 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(107 + 45);
  });
});

describe("zones", () => {
  it("hors zone : sur demande, deux véhicules minimum", () => {
    const r = calculerDevis({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "hors-zone" });
    expect(r).toEqual({ statut: "sur-demande", message: MESSAGE_HORS_ZONE, vehiculesMinimum: 2 });
  });

  it("zone 2 avec deux voitures : acceptée si l'une est au moins Le Complet", () => {
    const r = estimation({
      vehicules: [
        { formule: "interieur-net", gabarit: "S" },
        { formule: "complet", gabarit: "S" },
      ],
      zone: "zone2",
    });
    expect(r.total).toBe(59 + 109 + 10 - 15);
  });

  it("zone 2 avec Le Grand Soin ou Prêt à vendre : acceptée", () => {
    expect(statut(calculerDevis({ vehicules: [{ formule: "grand-soin", gabarit: "S" }], zone: "zone2" }))).toBe(
      "estimation",
    );
    expect(statut(calculerDevis({ vehicules: [{ formule: "pret-a-vendre", gabarit: "S" }], zone: "zone2" }))).toBe(
      "estimation",
    );
  });

  it("le supplément de zone 2 est compté une seule fois par visite", () => {
    const r = estimation({
      vehicules: [
        { formule: "complet", gabarit: "M" },
        { formule: "complet", gabarit: "M" },
      ],
      zone: "zone2",
    });
    expect(r.lignes.filter((l) => l.type === "deplacement")).toHaveLength(1);
    expect(r.total).toBe(119 + 119 + 10 - 15);
  });
});

describe("options", () => {
  it("véhicule très sale : affiché en fourchette et exclu du total", () => {
    const r = estimation({
      vehicules: [{ formule: "complet", gabarit: "M", options: { "tres-sale": 1 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(119);
    expect(r.aConfirmer).toEqual({ min: 25, max: 45 });
    expect(r.lignes.find((l) => l.type === "a-confirmer")?.fourchette).toEqual({ min: 25, max: 45 });
  });

  it("les options déjà comprises dans Le Grand Soin et Prêt à vendre sont indisponibles, avec la raison", () => {
    for (const id of ["shampooing-avant", "shampooing-cinq", "cuir", "desodorisation", "detachage"] as const) {
      expect(disponibilite("grand-soin", id).disponible).toBe(false);
      expect(disponibilite("pret-a-vendre", id).disponible).toBe(false);
      expect(disponibilite("interieur-net", id).disponible).toBe(true);
    }
    expect(disponibilite("pret-a-vendre", "cuir")).toEqual({
      disponible: false,
      raison: "Déjà inclus dans Prêt à vendre",
    });
  });

  it("l'extérieur seul ne s'ajoute pas au Complet, qui le comprend déjà", () => {
    expect(disponibilite("complet", "exterieur-seul").disponible).toBe(false);
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { "exterieur-seul": 1 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(59 + 55);
  });

  it("les poils modérés et importants s'excluent", () => {
    expect(basculerOption({ "poils-moderes": 1 }, "poils-importants", 1)).toEqual({ "poils-importants": 1 });
  });

  it("décocher une option la retire de la sélection", () => {
    expect(basculerOption({ cuir: 1, "siege-enfant": 2 }, "cuir", 0)).toEqual({ "siege-enfant": 2 });
  });

  it("changer de formule retire les options devenues inutiles", () => {
    expect(nettoyerOptions("grand-soin", { cuir: 1, "siege-enfant": 2, "shampooing-cinq": 1 })).toEqual({
      "siege-enfant": 2,
    });
  });

  it("quantités : 1 à 3 sièges enfants, 1 à 5 zones de détachage", () => {
    const sieges = (n: number) =>
      calculerDevis({
        vehicules: [{ formule: "complet", gabarit: "M", options: { "siege-enfant": n } }],
        zone: "zone1",
      }).statut;
    expect(sieges(3)).toBe("estimation");
    expect(sieges(4)).toBe("invalide");
    expect(sieges(1.5)).toBe("invalide");
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "M", options: { detachage: 3 } }],
      zone: "zone1",
    });
    expect(r.total).toBe(69 + 45);
  });

  it("rappel météo dès qu'il y a de l'extérieur", () => {
    const avecExterieur = estimation({ vehicules: [{ formule: "complet", gabarit: "S" }], zone: "zone1" });
    expect(avecExterieur.avertissements).toContainEqual({ code: "meteo-exterieur", message: MESSAGE_METEO });
    const sansExterieur = estimation({ vehicules: [{ formule: "interieur-net", gabarit: "S" }], zone: "zone1" });
    expect(sansExterieur.avertissements.map((a) => a.code)).not.toContain("meteo-exterieur");
  });
});

describe("offres et codes", () => {
  it("offre de lancement : désodorisation offerte sur L'Intérieur Net et Le Complet, jamais facturée", () => {
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { desodorisation: 1 } }],
      zone: "zone1",
      offreLancement: true,
    });
    expect(r.total).toBe(59);
    expect(r.lignes.some((l) => l.type === "offert" && l.libelle.startsWith("Désodorisation offerte"))).toBe(true);
  });

  it("sans offre de lancement, la désodorisation est facturée 20 €", () => {
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { desodorisation: 1 } }],
      zone: "zone1",
      offreLancement: false,
    });
    expect(r.total).toBe(79);
  });

  it("par défaut, l'offre de lancement suit les données (active et places restantes)", () => {
    const r = estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone1" });
    const attendue = OFFRES.lancement.actif && OFFRES.lancement.placesRestantes > 0;
    expect(r.lignes.some((l) => l.type === "offert")).toBe(attendue);
  });

  it("code GARAGE : la désodorisation facturée devient offerte", () => {
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { desodorisation: 1 } }],
      zone: "zone1",
      code: "garage",
      offreLancement: false,
    });
    expect(r.total).toBe(59);
    expect(r.avertissements.map((a) => a.code)).toContain("garage-creneau");
  });

  it("code GARAGE avec l'offre de lancement : c'est le siège enfant qui est offert", () => {
    const r = estimation({
      vehicules: [{ formule: "complet", gabarit: "M", options: { "siege-enfant": 1 } }],
      zone: "zone1",
      code: "GARAGE",
      offreLancement: true,
    });
    expect(r.total).toBe(119);
  });

  it("code VOISIN : 10 € de remise", () => {
    const r = estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone1", code: "VOISIN" });
    expect(r.total).toBe(109);
  });

  it("code parrain (référence AN-AAAA-NNNN) : 10 € de remise pour le filleul", () => {
    const r = estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone1", code: "an-2026-0142" });
    expect(r.total).toBe(109);
  });

  it("code inconnu : aucune remise, un avertissement", () => {
    const r = estimation({ vehicules: [{ formule: "complet", gabarit: "M" }], zone: "zone1", code: "PROMO50" });
    expect(r.total).toBe(119);
    expect(r.avertissements.map((a) => a.code)).toContain("code-inconnu");
  });

  it("professionnels, trois véhicules : 10 % sur les prestations, sans cumul avec la remise deuxième voiture", () => {
    const r = estimation({
      vehicules: [
        { formule: "complet", gabarit: "L" },
        { formule: "complet", gabarit: "L" },
        { formule: "complet", gabarit: "L" },
      ],
      zone: "zone1",
      professionnel: true,
      offreLancement: false,
    });
    // 3 × 129 = 387 → 387 × 0,9 = 348,3 → arrondi à 348 : remise de 39 €.
    expect(r.total).toBe(348);
    expect(r.lignes.filter((l) => l.type === "remise")).toHaveLength(1);
  });

  it("le total n'est jamais négatif et vaut la somme des lignes", () => {
    const r = estimation({
      vehicules: [{ formule: "interieur-net", gabarit: "S", options: { "siege-enfant": 3, cuir: 1 } }],
      zone: "zone1",
      code: "VOISIN",
    });
    expect(r.total).toBe(r.lignes.reduce((s, l) => s + l.montant, 0));
    expect(r.total).toBeGreaterThanOrEqual(0);
  });
});

describe("validation", () => {
  it("au moins une voiture", () => {
    expect(calculerDevis({ vehicules: [], zone: "zone1" }).statut).toBe("invalide");
  });
});
