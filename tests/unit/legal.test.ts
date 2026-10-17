import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PageCgv, { metadata as metaCgv } from "@/app/cgv/page";
import PageConfidentialite, { metadata as metaConfidentialite } from "@/app/confidentialite/page";
import PageMentions, { metadata as metaMentions } from "@/app/mentions-legales/page";
import sitemap from "@/app/sitemap";
import { liensLegaux } from "@/config/navigation";
import { communesDesservies, estRenseigne, site, zoneActive } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import {
  ANNEXE_CGV,
  ARTICLES_CGV,
  CONSERVATION,
  DELAI_REMBOURSEMENT_JOURS,
  DELAI_RETRACTATION_JOURS,
  PRESTATAIRES,
} from "@/data/legal";
import { DEPLACEMENT, FORMULES, GABARITS, GARANTIE, OPTIONS } from "@/data/offres";
import { DETAILS_PAIEMENT_SUR_PLACE, VALIDITE_LIEN_JOURS } from "@/data/paiement";
import { CASES_VALIDATION, COMPRESSION_PHOTOS, PAIEMENT_EN_LIGNE, TEXTE_EXECUTION_ANTICIPEE } from "@/data/reservation";
import { euros, initialeMinuscule } from "@/lib/texte";
import { fr } from "@/lib/typo";
import { prixOption } from "@/components/legal/Cgv";
import { Email } from "@/components/legal/Valeurs";
import { ACompleter, AConfirmer } from "@/components/ui/ACompleter";

// ---------------------------------------------------------------------------
// Outils : rendu HTML et texte lisible
// ---------------------------------------------------------------------------

const rendre = (Composant: ComponentType) => renderToStaticMarkup(createElement(Composant));

/** Texte lu à l'écran : sans balises, entités décodées, espaces insécables ramenées à des espaces. */
function texte(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,)])/g, "$1")
    .replace(/\( /g, "(")
    .trim();
}

/** Même normalisation pour une phrase attendue (typographie française comprise). */
const lisible = (phrase: string) => texte(fr(phrase));

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "");
const liens = (html: string) => [...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1] ?? "");
const emplacement = (libelle: string) => `[À COMPLÉTER : ${libelle}]`;

/** Fichiers .ts, .tsx et .mdx d'un dossier, récursivement. */
const fichiersSource = (dossier: string): string[] =>
  readdirSync(dossier, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(?:tsx?|mdx)$/.test(f))
    .map((f) => join(dossier, f));

const PAGES = {
  "/mentions-legales": { html: rendre(PageMentions), meta: metaMentions },
  "/cgv": { html: rendre(PageCgv), meta: metaCgv },
  "/confidentialite": { html: rendre(PageConfidentialite), meta: metaConfidentialite },
} as const;

const cgv = PAGES["/cgv"].html;
const texteCgv = texte(cgv);
const confidentialite = PAGES["/confidentialite"].html;
const texteConfidentialite = texte(confidentialite);
const texteMentions = texte(PAGES["/mentions-legales"].html);

// ---------------------------------------------------------------------------
// Composants d'injection
// ---------------------------------------------------------------------------

describe("composants d'injection : valeur renseignée ou emplacement", () => {
  it("ACompleter affiche la valeur, ou un emplacement si elle est vide", () => {
    expect(renderToStaticMarkup(createElement(ACompleter, { valeur: "Netlify, Inc.", libelle: "hébergeur" }))).toBe(
      "Netlify, Inc.",
    );
    for (const vide of ["", "   ", null, undefined]) {
      expect(texte(renderToStaticMarkup(createElement(ACompleter, { valeur: vide, libelle: "SIREN" })))).toBe(
        emplacement("SIREN"),
      );
    }
  });

  it("AConfirmer affiche un emplacement « à confirmer »", () => {
    expect(texte(renderToStaticMarkup(createElement(AConfirmer, { libelle: "règle" })))).toBe("[À CONFIRMER : règle]");
  });

  it("Email crée un lien mailto:, ou un emplacement", () => {
    expect(renderToStaticMarkup(createElement(Email, { adresse: "a@exemple.fr", libelle: "e-mail" }))).toContain(
      'href="mailto:a@exemple.fr"',
    );
    expect(texte(renderToStaticMarkup(createElement(Email, { adresse: "", libelle: "e-mail de A" })))).toBe(
      emplacement("e-mail de A"),
    );
  });

  // Chaque valeur de config/site.ts affichée par les pages légales : la valeur si elle est
  // renseignée, sinon son emplacement. Le test suit la configuration, vide ou remplie.
  const valeurs: [string, string, readonly (keyof typeof PAGES)[]][] = [
    ...(["A", "B"] as const).flatMap((l): [string, string, (keyof typeof PAGES)[]][] => {
      const a = site.associes[l];
      return [
        [a.prenomNom, `nom de l'associé ${l}`, ["/mentions-legales", "/cgv", "/confidentialite"]],
        [a.adresse, `adresse de l'associé ${l}`, ["/mentions-legales", "/cgv", "/confidentialite"]],
        [a.email, `e-mail de l'associé ${l}`, ["/mentions-legales", "/cgv", "/confidentialite"]],
        [a.siren, `SIREN de l'associé ${l}`, ["/mentions-legales"]],
        [a.immatriculation, `registre d'immatriculation de l'associé ${l}`, ["/mentions-legales"]],
        [a.telephone, `téléphone de l'associé ${l}`, ["/mentions-legales"]],
      ];
    }),
    [site.hebergeur.raisonSociale, "raison sociale de l'hébergeur", ["/mentions-legales", "/confidentialite"]],
    [site.hebergeur.adresse, "adresse de l'hébergeur", ["/mentions-legales"]],
    [site.hebergeur.telephone, "téléphone de l'hébergeur", ["/mentions-legales"]],
    [site.mediateur.nom, "nom du médiateur de la consommation", ["/mentions-legales", "/cgv"]],
    [site.mediateur.adresse, "adresse du médiateur", ["/mentions-legales", "/cgv"]],
    [site.assurance.assureur, "assureur", ["/mentions-legales", "/cgv"]],
    [site.assurance.numeroContrat, "numéro de contrat", ["/mentions-legales", "/cgv"]],
    [site.email, "e-mail", ["/mentions-legales", "/cgv", "/confidentialite"]],
    [site.telephone, "téléphone", ["/mentions-legales", "/cgv", "/confidentialite"]],
  ];

  it.each(valeurs)("« %s » ou [À COMPLÉTER : %s]", (valeur, libelle, chemins) => {
    for (const chemin of chemins) {
      const lu = texte(PAGES[chemin].html);
      if (estRenseigne(valeur)) {
        expect(lu, chemin).toContain(valeur);
        expect(lu, chemin).not.toContain(emplacement(libelle));
      } else {
        expect(lu, chemin).toContain(emplacement(libelle));
      }
    }
  });

  it("la mention de TVA vient de la configuration", () => {
    expect(texteMentions).toContain(site.mentionTva);
    expect(texteCgv).toContain(site.mentionTva);
  });

  it("chaque page signale que le texte reste à faire relire", () => {
    for (const { html } of Object.values(PAGES)) {
      expect(texte(html)).toContain("[À CONFIRMER : texte à faire relire par un professionnel du droit");
    }
  });
});

// ---------------------------------------------------------------------------
// CGV : structure
// ---------------------------------------------------------------------------

describe("CGV : articles, sommaire et ancres", () => {
  const source = readFileSync("src/content/cgv.mdx", "utf8");

  it("les articles du MDX suivent ARTICLES_CGV, dans le même ordre", () => {
    const dansLeTexte = [...source.matchAll(/^<Article id="([^"]+)" \/>$/gm)].map((m) => m[1]);
    expect(dansLeTexte).toEqual(ARTICLES_CGV.map((a) => a.id));
  });

  it("les renvois entre articles visent des articles existants", () => {
    const renvois = [...source.matchAll(/<RenvoiArticle id="([^"]+)" \/>/g)].map((m) => m[1]);
    expect(renvois.length).toBeGreaterThan(0);
    for (const id of renvois) expect(ARTICLES_CGV.map((a) => a.id)).toContain(id);
  });

  it("chaque article est numéroté et porte son ancre, l'annexe aussi", () => {
    ARTICLES_CGV.forEach((a, i) => {
      expect(cgv).toMatch(new RegExp(`<h2 id="${a.id}"[^>]*>.*?Article ${i + 1}</span>`));
    });
    expect(ids(cgv)).toContain(ANNEXE_CGV.id);
  });

  it("le sommaire renvoie vers chaque article et vers l'annexe", () => {
    const sommaire = cgv.match(/<nav aria-labelledby="titre-sommaire".*?<\/nav>/)?.[0] ?? "";
    expect(liens(sommaire)).toEqual([...ARTICLES_CGV.map((a) => `#${a.id}`), `#${ANNEXE_CGV.id}`]);
  });

  it("aucun identifiant en double, un seul h1 par page", () => {
    for (const [chemin, { html }] of Object.entries(PAGES)) {
      const liste = ids(html);
      expect(new Set(liste).size, chemin).toBe(liste.length);
      expect(html.match(/<h1[\s>]/g)?.length, chemin).toBe(1);
    }
  });

  it("tous les liens vers une ancre des pages légales aboutissent", () => {
    const sources = [
      ...Object.entries(PAGES).flatMap(([chemin, { html }]) => liens(html).map((href) => ({ chemin, href }))),
      // Liens écrits dans le code du site (page de paiement, accueil, textes MDX…).
      ...fichiersSource("src").flatMap((fichier) =>
        [...readFileSync(fichier, "utf8").matchAll(/\/(?:mentions-legales|cgv|confidentialite)#[\w-]+/g)].map((m) => ({
          chemin: fichier,
          href: m[0],
        })),
      ),
    ];
    const verifies = sources.filter(({ href }) => href.includes("#"));
    expect(verifies.length).toBeGreaterThan(ARTICLES_CGV.length);
    for (const { chemin, href } of verifies) {
      const [page, ancre] = href.split("#");
      const cible = (page || chemin) as keyof typeof PAGES;
      if (!(cible in PAGES)) continue;
      expect(ids(PAGES[cible].html), `${chemin} → ${href}`).toContain(ancre);
    }
  });

  it("le formulaire type de rétractation est en annexe, avec nom, adresse et e-mail de chaque associé", () => {
    const annexe = texte(cgv.slice(cgv.indexOf(`id="${ANNEXE_CGV.id}"`)));
    expect(annexe).toContain("Formulaire de rétractation");
    expect(annexe).toContain("Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat");
    expect(annexe).toContain("Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat");
    for (const champ of ["Commandé le :", "Nom du (des) consommateur(s) :", "Adresse du (des) consommateur(s) :", "Date :"]) {
      expect(annexe).toContain(champ);
    }
    expect(annexe).toContain("(*) Rayez la mention inutile.");
    for (const l of ["A", "B"] as const) {
      const a = site.associes[l];
      expect(annexe).toContain(estRenseigne(a.adresse) ? a.adresse : emplacement(`adresse de l'associé ${l}`));
      expect(annexe).toContain(estRenseigne(a.email) ? a.email : emplacement(`e-mail de l'associé ${l}`));
    }
  });
});

// ---------------------------------------------------------------------------
// CGV : textes repris des données
// ---------------------------------------------------------------------------

describe("CGV : cohérence avec les données", () => {
  it("la grille des prix reprend chaque formule et chaque gabarit", () => {
    for (const f of FORMULES) {
      const ligne = cgv.match(new RegExp(`<th scope="row"[^>]*>${f.nom.replace(/'/g, "&#x27;")}</th>(.*?)</tr>`))?.[1];
      expect(ligne, f.nom).toBeDefined();
      const cellules = [...(ligne ?? "").matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => texte(m[1] ?? ""));
      expect(cellules).toEqual(GABARITS.map((g) => texte(euros(f.prix[g.code]))));
    }
    expect(texteCgv).toContain("en euros TTC");
  });

  it("chaque option avec son prix", () => {
    for (const o of OPTIONS) expect(texteCgv).toContain(`${o.libelle} : ${texte(prixOption(o))}`);
    expect(texte(prixOption(OPTIONS.find((o) => o.id === "tres-sale")!))).toBe("de 25 à 45 €");
  });

  it("le délai de confirmation du prix ferme", () => {
    expect(texteCgv).toContain(lisible(`sous ${CONDITIONS.delaiPrixFermeHeures} heures après réception des photos`));
    expect(texteCgv).toContain(`${CONDITIONS.photosDemandees} photos`);
  });

  it("les suppléments : acceptés avant, jamais imposés sur place", () => {
    expect(texteCgv).toContain("par écrit, avant le rendez-vous");
    expect(texteCgv).toContain("Aucun supplément n'est jamais imposé sur place");
    expect(texteCgv).toContain("la formule réservée, au prix confirmé, sans supplément");
    expect(texteCgv).toContain("le report du rendez-vous, sans frais");
  });

  it("les conditions d'intervention", () => {
    expect(texteCgv).toContain(lisible(`prise électrique à moins de ${CONDITIONS.priseElectriqueMetres} m`));
    expect(texteCgv).toContain(lisible(`notre rallonge mesure ${CONDITIONS.rallongeMetres} m`));
    expect(texteCgv).toContain(lisible(`présence ${CONDITIONS.presenceMinutes} minutes au début`));
    expect(texteCgv).toContain(lisible(`environ ${CONDITIONS.eauLitres} litres`));
    expect(texteCgv).toContain("nous ne conduisons jamais votre véhicule");
    expect(texteCgv).toContain("restriction d'eau");
  });

  it("les zones et le déplacement", () => {
    const { rayons, zone1, zone2, ville } = zoneActive;
    expect(texteCgv).toContain(lisible(`${communesDesservies().length} communes autour de ${ville}`));
    expect(texteCgv).toContain(lisible(`jusqu'à ${rayons.zone1} km de ${ville} (${zone1.length} communes)`));
    expect(texteCgv).toContain(lisible(`commande d'au moins ${euros(DEPLACEMENT.zone1.commandeMinimale)}`));
    expect(texteCgv).toContain(lisible(`de ${rayons.zone1} à ${rayons.zone2} km (${zone2.length} communes)`));
    expect(texteCgv).toContain(lisible(`supplément de déplacement de ${euros(DEPLACEMENT.zone2.supplement)} par rendez-vous`));
    expect(texteCgv).toContain(lisible(`à partir de ${DEPLACEMENT.horsZone.vehiculesMinimum} véhicules`));
  });

  it("la règle d'annulation vient de la configuration, marquée tant qu'elle n'est pas confirmée", () => {
    expect(texteCgv).toContain(lisible(site.annulation.texte));
    expect(texteCgv.includes("[À CONFIRMER : règle de report et d'annulation]")).toBe(!site.annulation.confirmee);
  });

  it("la réservation se fait à distance : pas de paiement avant sept jours pour un contrat conclu au domicile", () => {
    expect(texteCgv).toContain("se réservent à distance");
    expect(texteCgv).toContain("avant un délai de sept jours");
  });

  it("le paiement : sans acompte, moyens en ligne et sur place, deux encaissements", () => {
    expect(texteCgv).toContain("aucun acompte");
    expect(texteCgv).toContain(lisible(`valable ${VALIDITE_LIEN_JOURS} jours`));
    expect(texteCgv).toContain(initialeMinuscule(PAIEMENT_EN_LIGNE.join(", ")));
    for (const detail of Object.values(DETAILS_PAIEMENT_SUR_PLACE)) expect(texteCgv).toContain(lisible(detail));
    expect(texteCgv).toContain("Chaque entrepreneur facture et encaisse les prestations qu'il réalise");
  });

  it("la rétractation cite mot pour mot la case de la réservation (même constante)", () => {
    expect(CASES_VALIDATION.executionAnticipee.avant).toBe(TEXTE_EXECUTION_ANTICIPEE);
    expect(TEXTE_EXECUTION_ANTICIPEE).toContain(`délai de rétractation de ${DELAI_RETRACTATION_JOURS} jours`);
    expect(texteCgv).toContain(lisible(`« ${TEXTE_EXECUTION_ANTICIPEE} »`));
    expect(texteCgv).toContain(lisible(`délai de rétractation de ${DELAI_RETRACTATION_JOURS} jours`));
    expect(texteCgv).toContain(lisible(`au plus tard ${DELAI_REMBOURSEMENT_JOURS} jours`));
    expect(texteCgv).toContain("une fois la prestation entièrement réalisée, vous ne pouvez plus vous rétracter");
    expect(texteCgv).toContain("vous payez un montant proportionnel");
  });

  it("la garantie Retouche reprend GARANTIE : promesse, limites, exclusions, sans « satisfait ou remboursé »", () => {
    expect(texteCgv).toContain(lisible(GARANTIE.texte));
    expect(texteCgv).toContain(GARANTIE.nom);
    for (const l of [...GARANTIE.limites, ...GARANTIE.exclusions]) expect(texteCgv).toContain(lisible(initialeMinuscule(l)));
    expect(texteCgv).toContain(lisible(`dans les ${CONDITIONS.retoucheHeures} heures`));
    expect(texteCgv).toContain("pas un remboursement");
    expect(texteCgv.toLowerCase()).not.toContain("satisfait ou rembours");
  });

  it("responsabilité : état des lieux photo, objets de valeur, véhicule jamais conduit", () => {
    expect(texteCgv).toContain("état des lieux photo");
    expect(texteCgv).toContain("objets de valeur");
    expect(texteCgv).toContain("nous ne le conduisons jamais");
  });

  it("médiation sans la plateforme européenne de règlement en ligne des litiges (fermée en 2025)", () => {
    expect(texteCgv).toContain("médiateur de la consommation");
    for (const { html } of Object.values(PAGES)) {
      expect(html).not.toMatch(/ec\.europa\.eu\/consumers\/odr|règlement en ligne des litiges/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Confidentialité
// ---------------------------------------------------------------------------

describe("politique de confidentialité : fonctionnement réel du site", () => {
  it("responsables conjoints : les deux associés", () => {
    expect(texteConfidentialite).toContain("responsables conjoints");
  });

  it("aucune base de données, un seul compteur, photos sans EXIF", () => {
    expect(texteConfidentialite).toContain("Aucune base de données");
    expect(texteConfidentialite).toContain("un nombre par année, sans aucune donnée personnelle");
    expect(texteConfidentialite).toContain(`${COMPRESSION_PHOTOS.coteMaxPx.toLocaleString("fr-FR").replace(/\s/g, " ")} pixels`);
    expect(texteConfidentialite).toContain(lisible(`moins de ${COMPRESSION_PHOTOS.poidsMaxOctets / 1024} Ko`));
    expect(texteConfidentialite).toContain("dont la position GPS, disparaissent");
  });

  it("aucune donnée bancaire, PayPal chargé seulement après un clic sur le bouton de la page de paiement", () => {
    expect(texteConfidentialite).toContain("Aucune donnée bancaire");
    expect(texteConfidentialite).toContain(lisible("n'est chargé qu'après votre clic sur « Payer avec PayPal »"));
    expect(readFileSync("src/components/paiement/PaiementPayPal.tsx", "utf8")).toContain('"Payer avec PayPal"');
  });

  it("destinataires : hébergeur et prestataires réellement utilisés", () => {
    for (const nom of Object.values(PRESTATAIRES)) expect(texteConfidentialite).toContain(nom);
    expect(texteConfidentialite).toContain(
      emplacement("vérifier pour chaque prestataire le pays d'hébergement et le mécanisme d'encadrement des transferts"),
    );
  });

  it("durées de conservation", () => {
    expect(texteConfidentialite).toContain(lisible(`${CONSERVATION.apresDernierContactAnnees} ans après notre dernier contact`));
    expect(texteConfidentialite).toContain(lisible(`${CONSERVATION.piecesComptablesAnnees} ans`));
    expect(texteConfidentialite).toContain("plaque d'immatriculation floutée");
  });

  it("droits et réclamation auprès de la CNIL", () => {
    for (const droit of ["accès", "rectification", "effacement", "portabilité", "limitation", "vous opposer", "après votre décès"]) {
      expect(texteConfidentialite).toContain(droit);
    }
    expect(confidentialite).toContain('href="https://www.cnil.fr"');
  });

  it("cookies : aucun cookie, aucun bandeau", () => {
    expect(texteConfidentialite).toContain("Aucun cookie déposé par le site");
    expect(texteConfidentialite).toContain("aucun bandeau");
  });
});

// ---------------------------------------------------------------------------
// Intégration : métadonnées, plan du site, liens
// ---------------------------------------------------------------------------

describe("pages légales : métadonnées, plan du site et liens", () => {
  const metas = Object.entries(PAGES).map(([chemin, { meta }]) => ({ chemin, meta }));

  it("titres et descriptions uniques, adresse canonique, pages indexables", () => {
    expect(new Set(metas.map(({ meta }) => meta.title)).size).toBe(metas.length);
    expect(new Set(metas.map(({ meta }) => meta.description)).size).toBe(metas.length);
    for (const { chemin, meta } of metas) {
      expect(meta.alternates?.canonical).toBe(chemin);
      expect(meta.robots).toBeUndefined();
      expect(String(meta.description).length).toBeGreaterThan(80);
    }
  });

  it("les trois pages sont dans le plan du site et dans le pied de page", () => {
    const urls = sitemap().map((e) => e.url);
    for (const chemin of Object.keys(PAGES)) {
      expect(urls).toContain(`${site.url}${chemin}`);
      expect(liensLegaux.map((l) => l.href)).toContain(chemin);
    }
  });

  it("les cases de la réservation renvoient vers les CGV et la confidentialité", () => {
    expect(CASES_VALIDATION.cgv.lien?.href).toBe("/cgv");
    expect(CASES_VALIDATION.donnees.lien?.href).toBe("/confidentialite");
  });

  it("aucune formulation proscrite", () => {
    for (const [chemin, { html }] of Object.entries(PAGES)) {
      expect(texte(html), chemin).not.toMatch(/100 % écologique|le meilleur|n°1|certifié|garanti sans rayure/i);
    }
  });
});
