import { describe, expect, it } from "vitest";
import { cibleErreur, etapeDuChamp, idChamp, idErreur } from "@/lib/reservation/champs";
import { effetDuCode } from "@/lib/reservation/devis";
import { erreursEtape, formulaireInitial } from "@/lib/reservation/schema";
import { nouvelleVoiture } from "@/lib/reservation/voiture";

describe("champs du formulaire et résumé d'erreurs (partie 9.1)", () => {
  it("identifiant de champ tiré de la clé d'erreur", () => {
    expect(idChamp("voitures.0.modele")).toBe("champ-voitures-0-modele");
    expect(idChamp("validation.executionAnticipee")).toBe("champ-validation-executionAnticipee");
    expect(idErreur("lieu.commune")).toBe("champ-lieu-commune-erreur");
  });

  it.each([
    ["voitures.1.modele", "champ-voitures-1-modele"],
    ["voitures.0.formule", "champ-voitures-0-formule-interieur-net"],
    ["voitures.0.gabarit", "champ-voitures-0-gabarit-S"],
    ["voitures.2.options.cuir", "champ-voitures-2-options"],
    ["voitures.0", "champ-voitures-0-modele"],
    ["creneaux", "champ-creneaux-0"],
    ["creneaux.2", "champ-creneaux-2"],
    ["devis", "champ-devis"],
  ] as const)("lien du résumé : %s → #%s", (cle, id) => {
    expect(cibleErreur(cle)).toBe(id);
  });

  it.each([
    ["voitures.0.modele", 1],
    ["voitures.1.siegesEnfant", 1],
    ["voitures", 1],
    ["voitures.0.options.cuir", 2],
    ["voitures.0.abonnement", 2],
    ["lieu.prise", 3],
    ["devis", 3],
    ["creneaux.1", 4],
    ["coordonnees.telephone", 5],
    ["paiement", 6],
    ["photo-avant", 6],
    ["validation.cgv", 7],
  ] as const)("refus du serveur : %s se corrige à l'étape %i", (cle, etape) => {
    expect(etapeDuChamp(cle)).toBe(etape);
  });

  it("chaque erreur de l'étape 1 a sa cible dans la page", () => {
    const donnees = formulaireInitial();
    donnees.voitures.push(nouvelleVoiture());
    const cles = Object.keys(erreursEtape(1, donnees, new Date("2026-10-16T10:00:00Z")));
    expect(cles).toEqual(expect.arrayContaining(["voitures.0.modele", "voitures.0.etat", "voitures.1.animaux"]));
    for (const cle of cles) expect(cibleErreur(cle)).toBe(idChamp(cle));
  });
});

describe("effet du code sur l'estimation (partie 7.6)", () => {
  const voitures = [nouvelleVoiture()];

  it("sans code : rien", () => {
    expect(effetDuCode({ voitures, commune: "Saintes", code: "" })).toBeNull();
  });

  it("VOISIN : la remise rue groupée et sa condition", () => {
    const effet = effetDuCode({ voitures, commune: "Saintes", code: "VOISIN" });
    expect(effet?.lignes).toEqual([{ type: "remise", libelle: "Rue groupée (code VOISIN)", montant: -10 }]);
    expect(effet?.remarques).toEqual(["Remise rue groupée : votre voisin doit réserver pour le même jour."]);
  });

  it("code parrain : remise filleul ; code inconnu : à vérifier, sans remise", () => {
    expect(effetDuCode({ voitures, commune: "Saintes", code: "AN-2026-0042" })?.lignes[0]).toMatchObject({ montant: -10 });
    const inconnu = effetDuCode({ voitures, commune: "Saintes", code: "PROMO" });
    expect(inconnu?.lignes).toEqual([]);
    expect(inconnu?.remarques[0]).toContain("« PROMO » non reconnu");
  });

  it("GARAGE : l'avantage et le créneau sous 7 jours", () => {
    const effet = effetDuCode({ voitures, commune: "Saintes", code: "GARAGE" });
    expect(effet?.lignes.length).toBe(1);
    expect(effet?.remarques).toContain("Code GARAGE : créneau proposé sous 7 jours.");
  });

  it("hors zone : pas d'estimation chiffrée, donc pas d'effet affiché", () => {
    expect(effetDuCode({ voitures, commune: "Royan", code: "VOISIN" })).toBeNull();
  });
});
