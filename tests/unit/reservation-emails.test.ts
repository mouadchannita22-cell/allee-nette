import { describe, expect, it } from "vitest";
import { ouACompleter, site } from "@/config/site";
import { MESSAGE_DEMANDE_RECUE, RAPPELS_RENDEZ_VOUS } from "@/data/reservation";
import { euros } from "@/lib/texte";
import { devisReservation } from "@/lib/reservation/devis";
import {
  courrielAssocies,
  courrielClient,
  echapperHtml,
  ligneObjet,
  lienWhatsAppClient,
  modeEnvoi,
  neutraliserLiens,
  type DemandePreparee,
} from "@/lib/reservation/emails";
import { creerSchemaReservation, type DonneesFormulaire } from "@/lib/reservation/schema";
import { modifierReponses, nouvelleVoiture } from "@/lib/reservation/voiture";
import { zoneDeCommune } from "@/lib/zones";

const SEPARATEUR = String.fromCharCode(0x200b);
const recueLe = new Date("2026-10-16T13:00:00Z");

function formulaire(maj: (d: DonneesFormulaire) => void = () => {}): DonneesFormulaire {
  const d: DonneesFormulaire = {
    voitures: [
      modifierReponses(
        { ...nouvelleVoiture(), modele: "Peugeot 308", formule: "complet" },
        { etat: "tres-sale", animaux: "un-peu", siegesEnfant: 1 },
      ),
    ],
    lieu: { adresse: "12 rue des Lilas", commune: "Saintes", emplacement: "copropriete", prise: "non" },
    creneaux: ["2026-10-21_apres-midi", "2026-10-24_matin", ""],
    coordonnees: {
      prenom: "Camille",
      telephone: "06 12 34 56 78",
      email: "camille@exemple.fr",
      connaissance: "garagiste",
      code: "GARAGE",
    },
    paiement: "en-ligne",
    validation: { cgv: true, executionAnticipee: true, donnees: true, offres: true },
    source: { utmSource: "garage", utmMedium: "qr", code: "GARAGE", referent: "www.google.com" },
  };
  maj(d);
  return d;
}

/** Demande validée par le schéma, comme sur le serveur. */
function preparer(maj?: (d: DonneesFormulaire) => void, extra: Partial<DemandePreparee> = {}): DemandePreparee {
  const demande = creerSchemaReservation({ maintenant: recueLe, toleranceJours: 1 }).parse(formulaire(maj));
  const zone = zoneDeCommune(demande.lieu.commune);
  return {
    reference: "AN-2026-0042",
    referenceSecours: false,
    recueLe,
    demande,
    zone,
    devis: devisReservation({ voitures: demande.voitures, commune: demande.lieu.commune, code: demande.coordonnees.code }, zone),
    photos: [],
    ...extra,
  };
}

describe("sécurité du contenu (partie 9.3)", () => {
  it("échappe le HTML", () => {
    expect(echapperHtml(`<script>alert('x') & "y"</script>`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;) &amp; &quot;y&quot;&lt;/script&gt;",
    );
  });

  it("tout contenu saisi est échappé dans les deux e-mails", () => {
    const d = preparer((f) => {
      f.coordonnees.prenom = `<img src=x onerror="alert(1)">`;
      f.voitures[0]!.modele = "<b>Clio</b>";
      f.lieu.adresse = "1 rue <i>&</i>";
    });
    for (const { html } of [courrielAssocies(d), courrielClient(d)]) {
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<b>Clio");
      expect(html).not.toContain("<i>");
      expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    }
  });

  it("aucune adresse web saisie n'est rendue cliquable", () => {
    expect(neutraliserLiens("voir https://promo.example/x")).toBe(`voir https:${SEPARATEUR}//promo.${SEPARATEUR}example/x`);
    expect(neutraliserLiens("12 av. St. Pierre")).toBe("12 av. St. Pierre");
    const d = preparer((f) => {
      f.voitures[0]!.modele = "www.promo.example";
      f.source = { utmCampaign: "https://promo.example" };
    });
    const { html, texte } = courrielAssocies(d);
    expect(html).not.toContain("promo.example");
    expect(texte).not.toContain("promo.example");
    // Un seul lien : le bouton WhatsApp vers le client, construit par nous.
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="https://wa.me/33612345678?text=');
  });

  it("objet sur une seule ligne, avec la référence", () => {
    expect(ligneObjet("Demande\r\nBcc: x@y.fr\tde  Camille")).toBe("Demande Bcc: x@y.fr de Camille");
    const d = preparer();
    const avecSaut: DemandePreparee = {
      ...d,
      demande: { ...d.demande, coordonnees: { ...d.demande.coordonnees, prenom: "Camille\r\nBcc: x@y.fr" } },
    };
    for (const { objet } of [courrielAssocies(avecSaut), courrielClient(avecSaut)]) {
      expect(objet).not.toMatch(/[\r\n]/);
      expect(objet).toContain("AN-2026-0042");
    }
    expect(courrielClient(d).objet).toBe("Demande reçue · AN-2026-0042 · Allée Nette");
  });
});

describe("e-mail aux associés", () => {
  const d = preparer(undefined, {
    photos: [{ champ: "photo-avant", libelle: "Habitacle avant", nomFichier: "photo-avant.jpg", type: "image/jpeg", octets: 1000 }],
  });
  const { objet, html, texte } = courrielAssocies(d);

  it("objet : référence, prénom, commune et total estimé", () => {
    expect(d.devis.statut).toBe("estimation");
    const total = d.devis.statut === "estimation" ? d.devis.total : 0;
    // Le code GARAGE offre le siège enfant : 119 + 25 + 15 − 15.
    expect(total).toBe(144);
    // L'espace insécable du montant devient une espace simple dans l'objet.
    expect(objet).toBe(`Nouvelle demande AN-2026-0042 · Camille · Saintes · ${euros(total).replace(/\s/g, " ")}`);
  });

  it("récapitulatif complet, en HTML et en texte", () => {
    for (const contenu of [html, texte]) {
      expect(contenu).toContain("vendredi 16 octobre 2026 à 15 h 00");
      expect(contenu).toContain("Peugeot 308");
      expect(contenu).toContain("Le Complet");
      expect(contenu).toContain("Très sale");
      expect(contenu).toContain("quantité modérée");
      expect(contenu).toContain("Siège enfant démonté et nettoyé × 1");
      expect(contenu).toContain("à confirmer sur vos photos");
      expect(contenu).toContain("12 rue des Lilas");
      expect(contenu).toContain("Saintes (zone 1)");
      expect(contenu).toContain("Mercredi 21 octobre, après-midi");
      expect(contenu).toContain("Samedi 24 octobre, matin");
      expect(contenu).toContain("06 12 34 56 78");
      expect(contenu).toContain("camille@exemple.fr");
      expect(contenu).toContain("Garagiste");
      expect(contenu).toContain("En ligne, après confirmation du prix");
      expect(contenu).toContain("Accepte de recevoir nos offres");
      expect(contenu).toContain("Habitacle avant : en pièce jointe (photo-avant.jpg)");
      expect(contenu).toContain("accord écrit du syndic");
      expect(contenu).toContain("Nous avons besoin d");
    }
    expect(texte).not.toMatch(/<[a-z]/i);
    // Créneaux par ordre de préférence.
    expect(texte).toContain("1. Mercredi 21 octobre, après-midi\n2. Samedi 24 octobre, matin");
    expect(html).toMatch(/<ol [^>]*><li [^>]*>Mercredi 21 octobre/);
    expect(texte).toContain("Déplacement en zone 1 : Inclus");
  });

  it("source de la visite : UTM, code et site d'origine", () => {
    expect(texte).toContain("Source (utm_source) : garage");
    expect(texte).toContain("Support (utm_medium) : qr");
    expect(texte).toContain("Code dans le lien : GARAGE");
    expect(texte).toContain(`Site d'origine : www.${SEPARATEUR}google.${SEPARATEUR}com`);
    expect(courrielAssocies(preparer((f) => void (f.source = {}))).texte).toContain("Aucune information");
  });

  it("lien WhatsApp prérempli avec la référence, au format international", () => {
    const lien = lienWhatsAppClient("+33612345678", "Camille", "AN-2026-0042")!;
    expect(lien.startsWith("https://wa.me/33612345678?text=")).toBe(true);
    expect(decodeURIComponent(lien.split("?text=")[1]!)).toBe(
      "Bonjour Camille, ici Allée Nette, au sujet de votre demande AN-2026-0042.",
    );
    expect(texte).toContain(`Répondre au client sur WhatsApp : ${lien}`);
    expect(lienWhatsAppClient("pas un numéro", "Camille", "AN-2026-0042")).toBeNull();
  });

  it("référence de secours signalée", () => {
    const secours = courrielAssocies(preparer(undefined, { reference: "AN-2026-9123", referenceSecours: true }));
    expect(secours.objet).toContain("référence de secours");
    expect(secours.html).toContain("Référence de secours");
  });

  it("hors zone : sur demande, sans total", () => {
    const horsZone = courrielAssocies(preparer((f) => void (f.lieu.commune = "Royan")));
    expect(horsZone.objet).toContain("sur demande");
    expect(horsZone.texte).toContain("Royan (hors zone)");
    expect(horsZone.texte).toContain("Hors zone : sur demande, deux véhicules minimum.");
  });

  it("offres refusées : « Non »", () => {
    expect(courrielAssocies(preparer((f) => void (f.validation.offres = false))).texte).toContain(
      "Accepte de recevoir nos offres : Non",
    );
  });
});

describe("e-mail au client", () => {
  const { html, texte } = courrielClient(preparer());

  it("confirmation, référence, récapitulatif, rappels et contacts", () => {
    expect(texte).toContain("Bonjour Camille,");
    expect(texte).toContain(MESSAGE_DEMANDE_RECUE);
    expect(MESSAGE_DEMANDE_RECUE).toBe("Demande reçue. Nous vous confirmons le prix ferme sous 2 heures.");
    expect(texte).toContain("Votre référence : AN-2026-0042");
    expect(texte).toContain("Mercredi 21 octobre, après-midi");
    expect(texte).toContain("Rien à payer maintenant");
    for (const rappel of RAPPELS_RENDEZ_VOUS) expect(texte).toContain(rappel);
    // Contacts non renseignés : emplacements visibles.
    // Valeurs de la configuration, ou emplacements « à compléter » si elles sont vides.
    expect(texte).toContain(ouACompleter(site.telephone, "téléphone"));
    if (!site.whatsapp) expect(texte).toContain("[À COMPLÉTER : numéro WhatsApp]");
    expect(html).toContain("Estimation");
  });

  it("sans photo jointe : invitation à les envoyer sur WhatsApp", () => {
    expect(texte).toContain("Envoyez-nous trois photos (habitacle avant, habitacle arrière, extérieur)");
  });

  it("ne contient pas les informations internes (source, offres)", () => {
    expect(texte).not.toContain("utm_source");
    expect(texte).not.toContain("Accepte de recevoir");
  });
});

describe("mode d'envoi", () => {
  const base = { cle: "re_test", expediteur: "Allée Nette <reservation@exemple.fr>", destinataires: ["a@exemple.fr"], production: true };

  it.each([
    ["tout est prêt", base, "envoi"],
    ["sans clé hors production : démonstration", { ...base, cle: "", production: false }, "demo"],
    ["sans clé en production : non configuré", { ...base, cle: "" }, "non-configure"],
    ["sans destinataire", { ...base, destinataires: [] }, "non-configure"],
    ["sans expéditeur", { ...base, expediteur: " " }, "non-configure"],
  ] as const)("%s", (_cas, config, attendu) => {
    expect(modeEnvoi(config)).toBe(attendu);
  });
});
