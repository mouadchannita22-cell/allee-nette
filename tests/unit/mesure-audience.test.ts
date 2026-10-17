import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MesureAudience } from "@/components/layout/MesureAudience";
import { ScriptUmami } from "@/components/layout/ScriptUmami";
import {
  evenementDuLien,
  reinitialiserMesure,
  suivre,
  suivreUneFois,
  viderFileAttente,
  type DonneesEvenement,
} from "@/lib/analytics";
import { configurationUmami, preparerEnvoiUmami, SRC_UMAMI_PAR_DEFAUT } from "@/lib/umami";

/**
 * Mesure d'audience sans cookie (partie 14 du brief) : suivre() ne gêne
 * jamais la navigation, le script Umami n'est configuré que si l'identifiant
 * est défini, et rien de personnel ne part vers Umami.
 */

type Appel = [string, DonneesEvenement | undefined];

/** Navigateur simulé (les tests tournent sous Node), avec ou sans Umami. */
function simulerNavigateur(avecUmami: boolean): Appel[] {
  const appels: Appel[] = [];
  const umami = { track: (nom: string, donnees?: DonneesEvenement) => void appels.push([nom, donnees]) };
  vi.stubGlobal("window", avecUmami ? { umami } : {});
  return appels;
}

function brancherUmami(): Appel[] {
  const appels: Appel[] = [];
  (window as Window).umami = { track: (nom, donnees) => void appels.push([nom, donnees]) };
  return appels;
}

beforeEach(() => reinitialiserMesure());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("suivre()", () => {
  it("ne fait rien et ne lève aucune erreur côté serveur", () => {
    expect(typeof window).toBe("undefined");
    expect(() => suivre("demande_envoyee")).not.toThrow();
    expect(() => suivreUneFois("calculateur_utilise")).not.toThrow();
    expect(() => viderFileAttente()).not.toThrow();
  });

  it("transmet le nom et les données à Umami", () => {
    const appels = simulerNavigateur(true);
    suivre("paiement_initie", { moyen: "stripe" });
    suivre("reservation_etape_3");
    expect(appels).toEqual([
      ["paiement_initie", { moyen: "stripe" }],
      ["reservation_etape_3", undefined],
    ]);
  });

  it("sans Umami (variable absente, bloqueur, réseau) : aucune erreur", () => {
    simulerNavigateur(false);
    expect(() => suivre("clic_telephone")).not.toThrow();
  });

  it("une erreur d'Umami ne remonte jamais", () => {
    vi.stubGlobal("window", {
      umami: {
        track: () => {
          throw new Error("panne");
        },
      },
    });
    expect(() => suivre("demande_envoyee")).not.toThrow();
  });

  it("garde les événements émis avant l'arrivée du script, puis les envoie dans l'ordre", () => {
    simulerNavigateur(false);
    suivre("reservation_etape_1");
    suivre("paiement_reussi", { moyen: "paypal" });
    const appels = brancherUmami();
    viderFileAttente();
    expect(appels).toEqual([
      ["reservation_etape_1", undefined],
      ["paiement_reussi", { moyen: "paypal" }],
    ]);
    viderFileAttente();
    expect(appels).toHaveLength(2);
  });

  it("la file d'attente est bornée : jamais de mémoire qui grossit sans fin", () => {
    simulerNavigateur(false);
    for (let i = 0; i < 100; i++) suivre(`reservation_etape_${i}`);
    const appels = brancherUmami();
    viderFileAttente();
    expect(appels).toHaveLength(20);
    expect(appels[0]?.[0]).toBe("reservation_etape_0");
  });

  it("suivreUneFois : un seul envoi pendant la visite", () => {
    const appels = simulerNavigateur(true);
    suivreUneFois("calculateur_utilise", { outil: "zones" });
    suivreUneFois("calculateur_utilise", { outil: "calculateur" });
    suivreUneFois("calculateur_utilise");
    expect(appels).toEqual([["calculateur_utilise", { outil: "zones" }]]);
  });
});

describe("evenementDuLien() : liens de contact", () => {
  it.each([
    ["tel:+33612345678", "clic_telephone"],
    ["TEL:0612345678", "clic_telephone"],
    ["https://wa.me/33612345678?text=Bonjour", "clic_whatsapp"],
    ["http://wa.me/33612345678", "clic_whatsapp"],
    ["https://api.whatsapp.com/send?phone=33612345678", "clic_whatsapp"],
    ["whatsapp://send?phone=33612345678", "clic_whatsapp"],
  ] as const)("%s → %s", (href, attendu) => {
    expect(evenementDuLien(href)).toBe(attendu);
  });

  it.each([
    "mailto:contact@exemple.fr",
    "/reserver",
    "#contenu",
    "https://exemple.fr/wa.me",
    "https://wa.me.exemple.fr/33612345678",
    "https://faux-whatsapp.com/",
    "javascript:void(0)",
    "",
    null,
    undefined,
  ])("%s → aucun événement", (href) => {
    expect(evenementDuLien(href)).toBeNull();
  });
});

describe("configuration du script Umami", () => {
  it("aucun script sans identifiant", () => {
    expect(configurationUmami(undefined, undefined, "https://allee-nette.fr")).toBeNull();
    expect(configurationUmami("", "https://stats.exemple.fr/script.js", "https://allee-nette.fr")).toBeNull();
    expect(configurationUmami("   ", undefined, "https://allee-nette.fr")).toBeNull();
  });

  it("script d'Umami Cloud par défaut, domaine tiré de l'adresse du site", () => {
    expect(configurationUmami(" id-site ", "", "https://www.allee-nette.fr")).toEqual({
      idSite: "id-site",
      src: SRC_UMAMI_PAR_DEFAUT,
      domaine: "www.allee-nette.fr",
    });
    expect(SRC_UMAMI_PAR_DEFAUT).toBe("https://cloud.umami.is/script.js");
  });

  it("script auto-hébergé : NEXT_PUBLIC_UMAMI_SRC", () => {
    expect(configurationUmami("id", "https://stats.exemple.fr/script.js", "http://localhost:3000")).toEqual({
      idSite: "id",
      src: "https://stats.exemple.fr/script.js",
      domaine: "localhost",
    });
  });

  it("MesureAudience ne rend rien tant que NEXT_PUBLIC_UMAMI_WEBSITE_ID est vide", () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(MesureAudience()).toBeNull();
  });

  it("MesureAudience rend le script quand l'identifiant est défini", () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "id-essai");
    vi.stubEnv("NEXT_PUBLIC_UMAMI_SRC", "");
    const element = MesureAudience();
    expect(element?.type).toBe(ScriptUmami);
    expect(element?.props).toMatchObject({ idSite: "id-essai", src: SRC_UMAMI_PAR_DEFAUT });
  });

  it("sans identifiant au build, le chargeur côté navigateur se réduit à rien", () => {
    const configuration = { idSite: "id-essai", src: SRC_UMAMI_PAR_DEFAUT, domaine: "allee-nette.fr" };
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(ScriptUmami(configuration)).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "id-essai");
    expect(ScriptUmami(configuration)?.props).toEqual(configuration);
    // next.config.ts inscrit l'identifiant même vide : le code jamais atteint est retiré au build.
    const config = readFileSync(join(import.meta.dirname, "..", "..", "next.config.ts"), "utf8");
    expect(config).toMatch(/NEXT_PUBLIC_UMAMI_WEBSITE_ID: process\.env\.NEXT_PUBLIC_UMAMI_WEBSITE_ID\?\.trim\(\) \?\? ""/);
  });
});

describe("filtre avant envoi à Umami : rien de personnel ne part", () => {
  const charge = (url: string, referrer = "") => ({ website: "id", hostname: "allee-nette.fr", url, referrer });

  it("retire la référence de la demande et garde la page", () => {
    const adresse = "https://allee-nette.fr/reserver/merci?ref=AN-2026-0042";
    expect(preparerEnvoiUmami(charge("/reserver/merci?ref=AN-2026-0042"), adresse)?.url).toBe("/reserver/merci");
    expect(preparerEnvoiUmami(charge(adresse), adresse)?.url).toBe("https://allee-nette.fr/reserver/merci");
  });

  it("retire la signature d'un lien de paiement et l'identifiant de session Stripe", () => {
    const paiement = "https://allee-nette.fr/paiement?ref=AN-2026-0042&montant=119&libelle=Le%20Complet%20M&encaisseur=A&exp=1790000000&sig=abc";
    expect(preparerEnvoiUmami(charge("/paiement"), paiement)?.url).toBe("/paiement");
    const merci = "https://allee-nette.fr/paiement/merci?session_id=cs_test_123#haut";
    expect(preparerEnvoiUmami(charge("/paiement/merci?session_id=cs_test_123#haut"), merci)?.url).toBe(
      "/paiement/merci",
    );
  });

  it("garde seulement les paramètres UTM de la page (lecture des campagnes)", () => {
    const adresse =
      "https://allee-nette.fr/reserver?code=GARAGE&utm_source=garage&utm_medium=qr&prenom=Camille&utm_campaign=lancement";
    expect(preparerEnvoiUmami(charge("/reserver"), adresse)?.url).toBe(
      "/reserver?utm_source=garage&utm_medium=qr&utm_campaign=lancement",
    );
  });

  it("le site d'origine perd ses paramètres", () => {
    const resultat = preparerEnvoiUmami(
      charge("/", "https://allee-nette.fr/reserver/merci?ref=AN-2026-0042"),
      "https://allee-nette.fr/",
    );
    expect(resultat?.referrer).toBe("https://allee-nette.fr/reserver/merci");
  });

  it("l'administration n'est jamais mesurée", () => {
    expect(preparerEnvoiUmami(charge("/admin/lien-paiement"), "https://allee-nette.fr/admin/lien-paiement")).toBeNull();
    expect(preparerEnvoiUmami(charge("/admin"), "https://allee-nette.fr/admin")).toBeNull();
    expect(preparerEnvoiUmami(charge("/administrateur"), "https://allee-nette.fr/administrateur")).not.toBeNull();
  });

  it("ne touche pas aux autres champs ni à une charge inattendue", () => {
    const resultat = preparerEnvoiUmami({ ...charge("/tarifs"), name: "calculateur_utilise" }, "https://allee-nette.fr/tarifs");
    expect(resultat).toEqual({ ...charge("/tarifs"), name: "calculateur_utilise" });
    expect(preparerEnvoiUmami("texte", "https://allee-nette.fr/")).toBe("texte");
  });
});
