import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { communesDesservies } from "@/config/site";
import { FAQ } from "@/content/faq";
import { FORMULES, duree, formule } from "@/data/offres";
import { donneesEntreprise, donneesFaq, versJsonLd } from "@/lib/donnees-structurees";
import { fr } from "@/lib/typo";

describe("typographie française", () => {
  const n = " ";
  it("espace insécable avant la ponctuation haute et entre nombre et unité", () => {
    expect(fr("Un point ne vous convient pas ? On revient.")).toBe(`Un point ne vous convient pas${n}? On revient.`);
    expect(fr("Saintes et 20 km alentour")).toBe(`Saintes et 20${n}km alentour`);
    expect(fr("dès 59 €, de 1 h 15 à 4 h")).toBe(`dès 59${n}€, de 1${n}h 15 à 4${n}h`);
    expect(fr("« Bonjour »")).toBe(`«${n}Bonjour${n}»`);
    expect(fr("3 photos")).toBe("3 photos");
  });
});

describe("durées affichées (partie 7.2 du brief)", () => {
  it.each([
    ["interieur-net", "1 h 15 à 1 h 45"],
    ["complet", "2 h 30 à 3 h 15"],
    ["grand-soin", "3 h à 4 h"],
    ["pret-a-vendre", "environ 3 h 40"],
  ] as const)("%s : %s", (id, attendu) => {
    expect(duree(formule(id))).toBe(attendu);
  });
});

describe("FAQ générée depuis les données (partie 11.3)", () => {
  const reponse = (id: string) => FAQ.find((q) => q.id === id)?.reponse;

  it("durée : de 1 h 15 à 4 h", () => {
    expect(reponse("duree")).toBe("De 1 h 15 pour L'Intérieur Net à 4 h pour Le Grand Soin, selon le gabarit et l'état.");
  });

  it("animaux : 25 ou 45 €", () => {
    expect(reponse("animaux")).toBe("Non : un supplément de 25 ou 45 € selon la quantité, annoncé avant, sur photo.");
  });

  it("eau et électricité", () => {
    expect(reponse("eau")).toContain("environ 10 litres");
    expect(reponse("electricite")).toContain("moins de 20 mètres");
    expect(reponse("electricite")).toContain("rallonge de 25 m");
  });

  it("la règle d'annulation non confirmée est marquée et exclue des données structurées", () => {
    expect(FAQ.find((q) => q.id === "annulation")?.aConfirmer).toBe(true);
    const questions = (donneesFaq().mainEntity as { name: string }[]).map((q) => q.name);
    expect(questions).not.toContain("Puis-je annuler ?");
    expect(questions.length).toBe(FAQ.length - 1);
  });
});

describe("données structurées (partie 12)", () => {
  const donnees = donneesEntreprise();
  const json = versJsonLd(donnees);

  it("type AutoWash, fourchette de prix et moyens de paiement", () => {
    expect(donnees["@type"]).toBe("AutoWash");
    expect(donnees.priceRange).toBe("59 € – 159 €");
    expect(donnees.paymentAccepted).toBe("Carte bancaire, Apple Pay, Google Pay, PayPal, Espèces");
    expect(donnees.currenciesAccepted).toBe("EUR");
  });

  it("pas d'AggregateRating, pas d'adresse de rue", () => {
    expect(json.toLowerCase()).not.toContain("aggregaterating");
    expect(json).not.toContain("streetAddress");
  });

  it("zone desservie = communes de la zone active", () => {
    expect((donnees.areaServed as unknown[]).length).toBe(communesDesservies().length);
  });

  it("catalogue : chaque formule, pour chaque gabarit, au bon prix", () => {
    const catalogue = donnees.hasOfferCatalog as { itemListElement: { name: string; itemListElement: { price: number }[] }[] };
    expect(catalogue.itemListElement).toHaveLength(FORMULES.length);
    for (const [i, f] of FORMULES.entries()) {
      expect(catalogue.itemListElement[i]!.itemListElement.map((o) => o.price)).toEqual([f.prix.S, f.prix.M, f.prix.L]);
    }
  });

  it("le caractère « < » est échappé", () => {
    expect(versJsonLd({ texte: "</script>" })).toBe('{"texte":"\\u003c/script>"}');
  });
});

describe("formulations interdites (partie 11.4)", () => {
  const INTERDITES = [/100\s*%\s*[ée]cologique/i, /\bn°\s*1\b/i, /\ble meilleur\b/i, /\bcertifi[ée]/i, /garanti sans rayure/i, /satisfait ou rembours/i, /aggregaterating/i];

  function fichiers(dossier: string): string[] {
    return readdirSync(dossier).flatMap((nom) => {
      const chemin = join(dossier, nom);
      return statSync(chemin).isDirectory() ? fichiers(chemin) : /\.(tsx?|mdx?)$/.test(nom) ? [chemin] : [];
    });
  }

  it("aucune dans le code du site", () => {
    const trouvees = fichiers("src").flatMap((f) => {
      const contenu = readFileSync(f, "utf8");
      return INTERDITES.filter((r) => r.test(contenu)).map((r) => `${f} : ${r}`);
    });
    expect(trouvees).toEqual([]);
  });
});
