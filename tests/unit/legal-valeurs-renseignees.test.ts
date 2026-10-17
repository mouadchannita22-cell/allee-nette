import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Pages légales avec une configuration entièrement renseignée : chaque valeur
 * s'affiche, aucun emplacement « [À COMPLÉTER] » ne reste pour elles, et la
 * règle d'annulation confirmée perd sa mention « [À CONFIRMER] ».
 * (legal.test.ts couvre la configuration telle qu'elle est dans le dépôt.)
 */
const REMPLIE = vi.hoisted(() => ({
  telephone: "06 12 34 56 78",
  whatsapp: "33612345678",
  email: "contact@exemple.fr",
  associes: {
    A: {
      prenomNom: "Alice Martin",
      siren: "123 456 789",
      immatriculation: "Registre national des entreprises",
      adresse: "1 rue de l'Essai, 17100 Saintes",
      email: "alice@exemple.fr",
      telephone: "06 11 11 11 11",
    },
    B: {
      prenomNom: "Bruno Petit",
      siren: "987 654 321",
      immatriculation: "Registre national des entreprises",
      adresse: "2 rue de l'Essai, 17100 Saintes",
      email: "bruno@exemple.fr",
      telephone: "06 22 22 22 22",
    },
  },
  hebergeur: { raisonSociale: "Hébergeur Essai", adresse: "3 avenue de l'Essai, Paris", telephone: "01 23 45 67 89" },
  mediateur: { nom: "Médiateur Essai", adresse: "4 place de l'Essai, Lyon", site: "https://mediateur.exemple.fr" },
  assurance: { assureur: "Assureur Essai", numeroContrat: "RC-0042" },
}));

vi.mock("@/config/site", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/config/site")>();
  return {
    ...original,
    site: { ...original.site, ...REMPLIE, annulation: { ...original.site.annulation, confirmee: true } },
  };
});

const { default: PageMentions } = await import("@/app/mentions-legales/page");
const { default: PageCgv } = await import("@/app/cgv/page");
const { default: PageConfidentialite } = await import("@/app/confidentialite/page");

const texte = (Composant: ComponentType) =>
  renderToStaticMarkup(createElement(Composant))
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ");

const pages = { mentions: texte(PageMentions), cgv: texte(PageCgv), confidentialite: texte(PageConfidentialite) };

describe("pages légales avec une configuration renseignée", () => {
  it("les mentions légales affichent toutes les valeurs, sans emplacement de configuration", () => {
    const { associes, hebergeur, mediateur, assurance } = REMPLIE;
    const attendues = [
      ...Object.values(associes).flatMap((a) => Object.values(a)),
      ...Object.values(hebergeur),
      mediateur.nom,
      mediateur.adresse,
      "mediateur.exemple.fr",
      ...Object.values(assurance),
      REMPLIE.email,
      REMPLIE.telephone,
    ];
    for (const valeur of attendues) expect(pages.mentions).toContain(valeur);
    expect(pages.mentions).not.toContain("[À COMPLÉTER");
  });

  it("les CGV nomment les associés, le médiateur et l'assureur ; l'annulation confirmée n'est plus marquée", () => {
    for (const a of Object.values(REMPLIE.associes)) {
      expect(pages.cgv).toContain(`${a.prenomNom} EI`);
      expect(pages.cgv).toContain(a.adresse);
      expect(pages.cgv).toContain(a.email);
    }
    expect(pages.cgv).toContain(REMPLIE.mediateur.nom);
    expect(pages.cgv).toContain(`${REMPLIE.assurance.assureur}, contrat n° ${REMPLIE.assurance.numeroContrat}`);
    expect(pages.cgv).not.toContain("[À COMPLÉTER");
    expect(pages.cgv).not.toContain("[À CONFIRMER : règle de report et d'annulation]");
  });

  it("la confidentialité nomme les responsables et l'hébergeur ; restent seulement les vérifications hors configuration", () => {
    for (const a of Object.values(REMPLIE.associes)) expect(pages.confidentialite).toContain(a.prenomNom);
    expect(pages.confidentialite).toContain(REMPLIE.hebergeur.raisonSociale);
    const restants = [...pages.confidentialite.matchAll(/\[À COMPLÉTER : ([^\]]+)\]/g)].map((m) => m[1]);
    expect(restants).toEqual([
      "fournisseur des boîtes e-mail des associés",
      "vérifier pour chaque prestataire le pays d'hébergement et le mécanisme d'encadrement des transferts",
    ]);
  });
});
