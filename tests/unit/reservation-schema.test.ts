import { describe, expect, it } from "vitest";
import { MESSAGE_ZONE_2 } from "@/lib/prix";
import { depuisParametres } from "@/lib/devis-url";
import { formaterTelephone, normaliserTelephone, numeroWhatsApp } from "@/lib/telephone";
import {
  creerSchemaReservation,
  erreursDepuisZod,
  erreursEtape,
  erreursFormulaire,
  formulaireInitial,
  type DonneesFormulaire,
} from "@/lib/reservation/schema";
import { modifierReponses, nouvelleVoiture } from "@/lib/reservation/voiture";

/** Vendredi 16 octobre 2026, 15 h à Paris. */
const maintenant = new Date("2026-10-16T13:00:00Z");
const schemaNavigateur = creerSchemaReservation({ maintenant });

function demandeValide(): DonneesFormulaire {
  return {
    voitures: [
      modifierReponses({ ...nouvelleVoiture(), modele: "Peugeot 308" }, { etat: "normal", animaux: "non", siegesEnfant: 0 }),
    ],
    lieu: { adresse: "12 rue des Lilas", commune: "Saintes", emplacement: "allee", prise: "oui" },
    creneaux: ["2026-10-21_apres-midi", "", ""],
    coordonnees: {
      prenom: "Camille",
      telephone: "06 12 34 56 78",
      email: "camille@exemple.fr",
      connaissance: "google",
      code: "",
    },
    paiement: "sur-place",
    validation: { cgv: true, executionAnticipee: true, donnees: true, offres: false },
    source: { utmSource: "flyer" },
  };
}

/** Erreurs du schéma complet pour une demande modifiée. */
function erreurs(modifier: (d: DonneesFormulaire) => void, schema = schemaNavigateur) {
  const d = demandeValide();
  modifier(d);
  const r = schema.safeParse(d);
  return r.success ? {} : erreursDepuisZod(r.error);
}

describe("schéma de la demande (partie 9)", () => {
  it("accepte une demande complète et la normalise", () => {
    const r = schemaNavigateur.safeParse({ ...demandeValide(), total: 1, inconnu: "x" });
    expect(r.success).toBe(true);
    expect(r.data?.coordonnees.telephone).toBe("+33612345678");
    expect(r.data?.creneaux).toEqual(["2026-10-21_apres-midi"]);
    expect(r.data).not.toHaveProperty("total");
    expect(r.data?.source).toEqual({ utmSource: "flyer" });
  });

  it("les trois cases sont obligatoires, la case des offres ne l'est pas", () => {
    expect(
      erreurs((d) => {
        d.validation = { cgv: false, executionAnticipee: false, donnees: false, offres: false };
      }),
    ).toEqual({
      "validation.cgv": "Acceptez les conditions générales de vente pour envoyer votre demande.",
      "validation.executionAnticipee": "Cochez cette case pour que la prestation puisse avoir lieu dans les 14 jours.",
      "validation.donnees":
        "Acceptez le traitement de vos données : sans elles, nous ne pouvons pas traiter votre demande.",
    });
    expect(erreurs((d) => void (d.validation.offres = true))).toEqual({});
    expect(erreurs((d) => void Reflect.deleteProperty(d.validation, "executionAnticipee"))).toHaveProperty(
      "validation.executionAnticipee",
    );
  });

  it("créneaux : au moins un, sans doublon, dans la fenêtre proposée", () => {
    expect(erreurs((d) => void (d.creneaux = ["", "", ""]))).toEqual({ "creneaux.0": "Choisissez au moins un créneau." });
    expect(erreurs((d) => void (d.creneaux = ["", "2026-10-24_matin", ""]))).toEqual({});
    expect(erreurs((d) => void (d.creneaux = ["2026-10-21_apres-midi", "2026-10-21_apres-midi"]))).toEqual({
      "creneaux.1": "Vous avez déjà choisi ce créneau.",
    });
    expect(erreurs((d) => void (d.creneaux = ["2026-12-02_apres-midi"]))).toEqual({
      "creneaux.0": "Ce créneau n'est plus proposé : choisissez-en un autre.",
    });
    expect(erreurs((d) => void (d.creneaux = ["2026-10-22_matin"]))).toHaveProperty("creneaux.0");
    expect(erreurs((d) => void (d.creneaux = ["demain"]))).toEqual({ "creneaux.0": "Créneau invalide." });
    expect(erreurs((d) => void (d.creneaux = ["", "", "", "2026-10-21_apres-midi"]))).toHaveProperty("creneaux");
  });

  it("le serveur tolère un jour d'écart (formulaire ouvert la veille)", () => {
    const samedi = new Date("2026-10-17T10:00:00Z");
    const modifier = (d: DonneesFormulaire) => void (d.creneaux = ["2026-10-17_apres-midi"]);
    expect(erreurs(modifier, creerSchemaReservation({ maintenant: samedi }))).toHaveProperty("creneaux.0");
    expect(erreurs(modifier, creerSchemaReservation({ maintenant: samedi, toleranceJours: 1 }))).toEqual({});
  });

  it("téléphone et e-mail", () => {
    expect(erreurs((d) => void (d.coordonnees.telephone = "06 12 34"))).toEqual({
      "coordonnees.telephone": "Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.",
    });
    expect(erreurs((d) => void (d.coordonnees.email = "camille@"))).toHaveProperty("coordonnees.email");
    expect(erreurs((d) => void (d.coordonnees.email = "  Camille.Durand+auto@exemple.fr "))).toEqual({});
  });

  it("longueur maximale sur chaque texte, une seule ligne", () => {
    expect(erreurs((d) => void (d.voitures[0]!.modele = "x".repeat(61)))).toEqual({
      "voitures.0.modele": "60 caractères au plus.",
    });
    expect(erreurs((d) => void (d.lieu.adresse = "x".repeat(121)))).toHaveProperty("lieu.adresse");
    expect(erreurs((d) => void (d.lieu.commune = "x".repeat(81)))).toHaveProperty("lieu.commune");
    expect(erreurs((d) => void (d.coordonnees.prenom = "x".repeat(61)))).toHaveProperty("coordonnees.prenom");
    expect(erreurs((d) => void (d.coordonnees.prenom = "Camille\r\nBcc: x@y.fr"))).toHaveProperty("coordonnees.prenom");
    expect(erreurs((d) => void (d.coordonnees.prenom = "   "))).toEqual({ "coordonnees.prenom": "Indiquez votre prénom." });
  });

  it("énumérations tirées des données", () => {
    expect(erreurs((d) => void Object.assign(d.lieu, { emplacement: "trottoir" }))).toHaveProperty("lieu.emplacement");
    expect(erreurs((d) => void Object.assign(d.voitures[0]!, { formule: "premium" }))).toHaveProperty("voitures.0.formule");
    expect(erreurs((d) => void Object.assign(d.voitures[0]!, { gabarit: "XL" }))).toHaveProperty("voitures.0.gabarit");
    expect(erreurs((d) => void Object.assign(d.voitures[0]!, { options: { lustrage: 1 } }))).toHaveProperty(
      "voitures.0.options",
    );
    expect(erreurs((d) => void Object.assign(d, { paiement: "cheque" }))).toEqual({
      paiement: "Choisissez comment vous préférez payer.",
    });
    expect(erreurs((d) => void (d.voitures = []))).toEqual({ voitures: "Ajoutez au moins une voiture." });
    expect(erreurs((d) => void (d.voitures = [d.voitures[0]!, d.voitures[0]!, d.voitures[0]!, d.voitures[0]!]))).toEqual({
      voitures: "3 voitures au plus par demande.",
    });
  });

  it("code : majuscules, lettres, chiffres et tirets", () => {
    const r = schemaNavigateur.safeParse({ ...demandeValide(), coordonnees: { ...demandeValide().coordonnees, code: " voisin " } });
    expect(r.data?.coordonnees.code).toBe("VOISIN");
    expect(erreurs((d) => void (d.coordonnees.code = "AN-2026-0042"))).toEqual({});
    expect(erreurs((d) => void (d.coordonnees.code = "<b>"))).toEqual({
      "coordonnees.code": "Lettres, chiffres et tirets seulement.",
    });
  });
});

describe("téléphone français ou international, normalisé", () => {
  it.each([
    ["06 12 34 56 78", "+33612345678"],
    ["06.12.34.56.78", "+33612345678"],
    ["0546123456", "+33546123456"],
    ["+33 6 12 34 56 78", "+33612345678"],
    ["+33 (0)6 12 34 56 78", "+33612345678"],
    ["0033 6 12 34 56 78", "+33612345678"],
    ["+32 470 12 34 56", "+32470123456"],
  ])("%s → %s", (saisie, attendu) => {
    expect(normaliserTelephone(saisie)).toBe(attendu);
  });

  it.each(["12345", "06 12 34 56", "06 12 34 56 78 9", "+33 0 12 34 56 78", "+0612345678", "abc", "06-12-34-56-78 poste 2", ""])(
    "%s → refusé",
    (saisie) => {
      expect(normaliserTelephone(saisie)).toBeNull();
    },
  );

  it("affichage et lien WhatsApp", () => {
    expect(formaterTelephone("+33612345678")).toBe("06 12 34 56 78");
    expect(formaterTelephone("+32470123456")).toBe("+32470123456");
    expect(numeroWhatsApp("06 12 34 56 78")).toBe("33612345678");
    expect(numeroWhatsApp("n'importe quoi")).toBeNull();
  });
});

describe("validation étape par étape", () => {
  it("étape 1 : modèle, état et animaux demandés pour chaque voiture", () => {
    const d = formulaireInitial();
    expect(Object.keys(erreursEtape(1, d, maintenant))).toEqual([
      "voitures.0.modele",
      "voitures.0.etat",
      "voitures.0.animaux",
    ]);
    expect(erreursEtape(1, demandeValide(), maintenant)).toEqual({});
  });

  it("étape 2 : commande minimale en zone 1 (L'Intérieur Net S en abonnement)", () => {
    const d = demandeValide();
    d.voitures[0] = { ...d.voitures[0]!, formule: "interieur-net", gabarit: "S", abonnement: true };
    expect(erreursEtape(2, d, maintenant)).toEqual({ devis: "Commande minimale de 59 € en zone 1." });
  });

  it("étape 3 : zone 2 avec L'Intérieur Net bloque ; hors zone, la demande reste possible", () => {
    const d = demandeValide();
    d.voitures[0] = { ...d.voitures[0]!, formule: "interieur-net" };
    d.lieu.commune = "Pons";
    // À l'étape 2, le refus attend le choix de la commune.
    expect(erreursEtape(2, d, maintenant)).toEqual({});
    expect(erreursEtape(3, d, maintenant)).toEqual({ devis: `${MESSAGE_ZONE_2}.` });
    d.lieu.commune = "Royan";
    expect(erreursEtape(3, d, maintenant)).toEqual({});
  });

  it("étapes 3 à 7 : chaque champ obligatoire a son message", () => {
    const d = formulaireInitial();
    expect(Object.keys(erreursEtape(3, d, maintenant))).toEqual([
      "lieu.adresse",
      "lieu.commune",
      "lieu.emplacement",
      "lieu.prise",
    ]);
    expect(erreursEtape(4, d, maintenant)).toEqual({ "creneaux.0": "Choisissez au moins un créneau." });
    expect(Object.keys(erreursEtape(5, d, maintenant))).toEqual([
      "coordonnees.prenom",
      "coordonnees.telephone",
      "coordonnees.email",
    ]);
    expect(Object.keys(erreursEtape(6, d, maintenant))).toEqual(["paiement"]);
    expect(Object.keys(erreursEtape(7, d, maintenant))).toEqual([
      "validation.cgv",
      "validation.executionAnticipee",
      "validation.donnees",
    ]);
  });

  it("formulaire complet : première étape à corriger", () => {
    expect(erreursFormulaire(demandeValide(), maintenant)).toEqual({ etape: null, erreurs: {} });
    const d = demandeValide();
    d.paiement = "";
    expect(erreursFormulaire(d, maintenant).etape).toBe(6);
  });

  it("préremplissage depuis l'URL du calculateur", () => {
    const d = formulaireInitial(depuisParametres(new URLSearchParams("f=grand-soin&g=L&f2=complet&g2=S&c=Pons&code=garage")));
    expect(d.voitures.map((v) => [v.formule, v.gabarit])).toEqual([
      ["grand-soin", "L"],
      ["complet", "S"],
    ]);
    expect(d.lieu.commune).toBe("Pons");
    expect(d.coordonnees).toMatchObject({ code: "GARAGE", connaissance: "garagiste" });
    expect(d.creneaux).toEqual(["", "", ""]);
    expect(d.validation).toEqual({ cgv: false, executionAnticipee: false, donnees: false, offres: false });
  });
});

describe("envoi trafiqué", () => {
  it.each([
    ["vide", {}],
    ["blocs du mauvais type", { voitures: "x", lieu: 3, creneaux: {}, coordonnees: [], paiement: 1, validation: null }],
    [
      "champs du mauvais type",
      {
        voitures: [{ modele: 1, gabarit: null, etat: [], siegesEnfant: 1.5, formule: {}, options: { cuir: 0, lustrage: 1 }, abonnement: "oui" }],
        lieu: { adresse: 1, commune: null, emplacement: 2, prise: true },
        creneaux: [1, null],
        coordonnees: { prenom: [], telephone: 612345678, email: 3, connaissance: "tiktok", code: 5 },
        validation: { cgv: "true", executionAnticipee: 1, donnees: "oui", offres: "non" },
        source: "x",
      },
    ],
  ])("%s : messages en français uniquement", (_nom, envoi) => {
    const r = schemaNavigateur.safeParse(envoi);
    expect(r.success).toBe(false);
    const messages = Object.values(erreursDepuisZod(r.error!));
    expect(messages.filter((m) => /Invalid input|expected|Too (small|big)|Unrecognized/.test(m))).toEqual([]);
  });
});
