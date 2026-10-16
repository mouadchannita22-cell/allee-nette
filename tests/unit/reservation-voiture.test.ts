import { describe, expect, it } from "vitest";
import { MESSAGE_ZONE_2 } from "@/lib/prix";
import { depuisParametres } from "@/lib/devis-url";
import { blocageDevis, devisReservation, zoneReservation } from "@/lib/reservation/devis";
import {
  changerFormule,
  modifierOptions,
  modifierReponses,
  nouvelleVoiture,
  vehiculeDevis,
  voitureDepuisVehicule,
  type VoitureFormulaire,
} from "@/lib/reservation/voiture";

const voiture = (maj: Partial<VoitureFormulaire> = {}): VoitureFormulaire => ({ ...nouvelleVoiture(), ...maj });

describe("étape 1 → options (partie 9.1)", () => {
  it("« Très sale » coche le supplément à confirmer sur photos, « Sale » le retire", () => {
    const v = modifierReponses(voiture(), { etat: "tres-sale" });
    expect(v.options).toEqual({ "tres-sale": 1 });
    expect(modifierReponses(v, { etat: "sale" }).options).toEqual({});
  });

  it("animaux : une seule option de poils à la fois, jamais les deux", () => {
    const peu = modifierReponses(voiture(), { animaux: "un-peu" });
    expect(peu.options).toEqual({ "poils-moderes": 1 });
    const beaucoup = modifierReponses(peu, { animaux: "beaucoup" });
    expect(beaucoup.options).toEqual({ "poils-importants": 1 });
    expect(modifierReponses(beaucoup, { animaux: "non" }).options).toEqual({});
  });

  it("sièges enfants : siege-enfant × n, borné à 3", () => {
    expect(modifierReponses(voiture(), { siegesEnfant: 2 }).options).toEqual({ "siege-enfant": 2 });
    expect(modifierReponses(voiture(), { siegesEnfant: 7 }).siegesEnfant).toBe(3);
    expect(modifierReponses(voiture({ options: { "siege-enfant": 2 } }), { siegesEnfant: 0 }).options).toEqual({});
  });

  it("les autres options ne bougent pas", () => {
    const v = modifierReponses(voiture({ options: { cuir: 1 } }), { animaux: "un-peu" });
    expect(v.options).toEqual({ cuir: 1, "poils-moderes": 1 });
  });
});

describe("options → étape 1", () => {
  it("cocher une option de poils ou un siège met à jour les réponses", () => {
    const v = modifierOptions(voiture({ animaux: "non" }), { "poils-importants": 1, "siege-enfant": 3 });
    expect(v).toMatchObject({ animaux: "beaucoup", siegesEnfant: 3 });
  });

  it("décocher « très sale » ramène l'état à « Sale », décocher les poils à « Non »", () => {
    const v = modifierReponses(voiture(), { etat: "tres-sale", animaux: "un-peu" });
    expect(modifierOptions(v, {})).toMatchObject({ etat: "sale", animaux: "non", siegesEnfant: 0 });
  });

  it("une réponse pas encore donnée le reste tant que l'option n'est pas cochée", () => {
    expect(modifierOptions(voiture(), { cuir: 1 })).toMatchObject({ etat: "", animaux: "" });
  });

  it("préremplissage depuis l'URL du calculateur", () => {
    const etat = depuisParametres(new URLSearchParams("f=interieur-net&g=S&o=poils-moderes,siege-enfant:2,tres-sale&ab=1"));
    const v = voitureDepuisVehicule(etat.vehicules[0]!);
    expect(v).toMatchObject({
      formule: "interieur-net",
      gabarit: "S",
      etat: "tres-sale",
      animaux: "un-peu",
      siegesEnfant: 2,
      abonnement: true,
    });
  });
});

describe("devis de la demande", () => {
  it("L'Intérieur Net, S, un peu de poils, 2 sièges enfants : 114 € (partie 8)", () => {
    const v = modifierReponses(voiture({ formule: "interieur-net", gabarit: "S" }), {
      etat: "normal",
      animaux: "un-peu",
      siegesEnfant: 2,
    });
    const r = devisReservation({ voitures: [v], commune: "Saintes", code: "" });
    expect(r.statut === "estimation" && r.total).toBe(114);
  });

  it("les réponses de l'étape 1 font foi : un envoi incohérent ne double pas les poils", () => {
    const v = voiture({ animaux: "un-peu", options: { "poils-importants": 1, "poils-moderes": 1 } });
    expect(vehiculeDevis(v).options).toEqual({ "poils-moderes": 1 });
  });

  it("changer de formule retire les options incluses et l'abonnement indisponible", () => {
    const v = changerFormule(voiture({ formule: "complet", abonnement: true, options: { cuir: 1, "siege-enfant": 1 } }), "grand-soin");
    expect(v).toMatchObject({ formule: "grand-soin", abonnement: false, options: { "siege-enfant": 1 } });
  });

  it("zone : zone 1 tant que la commune est vide, hors zone si elle est inconnue", () => {
    expect(zoneReservation("")).toBe("zone1");
    expect(zoneReservation("Pons")).toBe("zone2");
    expect(zoneReservation("Royan")).toBe("hors-zone");
  });

  it("zone 2 avec L'Intérieur Net : bloqué ; hors zone : la demande reste possible", () => {
    const v = voiture({ formule: "interieur-net" });
    expect(blocageDevis(devisReservation({ voitures: [v], commune: "Pons", code: "" }))).toBe(`${MESSAGE_ZONE_2}.`);
    expect(blocageDevis(devisReservation({ voitures: [v], commune: "Royan", code: "" }))).toBeNull();
    expect(blocageDevis(devisReservation({ voitures: [voiture()], commune: "Pons", code: "" }))).toBeNull();
  });
});
