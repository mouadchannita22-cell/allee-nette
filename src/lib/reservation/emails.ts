/**
 * E-mails de la réservation (partie 9.3 du brief) : un pour les deux
 * associés, un pour le client. Fonctions pures, testées ; l'envoi se fait
 * dans `envoi.ts`.
 *
 * - HTML simple et robuste (tableaux, styles en ligne, couleurs de la
 *   marque) et version texte, construits à partir des mêmes blocs.
 * - Tout ce que le client a saisi est échappé ; les adresses web qu'il
 *   aurait tapées sont désamorcées (aucune n'est rendue cliquable).
 * - L'objet tient sur une seule ligne.
 */
import { estRenseigne, ouACompleter, site } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { GABARITS, OPTIONS, formule as trouverFormule, type ZoneTarif } from "@/data/offres";
import {
  ANIMAUX,
  ETATS_VEHICULE,
  MESSAGE_COPROPRIETE,
  MESSAGE_DEMANDE_RECUE,
  MESSAGE_SANS_PRISE,
  MODES_PAIEMENT,
  PHOTOS_DEMANDEES,
  QUESTION_CONNAISSANCE,
  RAPPELS_RENDEZ_VOUS,
  RAPPEL_PAIEMENT,
  REPONSES_PRISE,
  SOURCES_CONNAISSANCE,
  TYPES_EMPLACEMENT,
  libelleDe,
} from "@/data/reservation";
import { lienWhatsApp } from "@/lib/contact";
import { formaterDateHeureParis } from "@/lib/date-paris";
import { MENTION_ESTIMATION, type LigneDevis, type ResultatDevis } from "@/lib/prix";
import { LIBELLES_SOURCE } from "@/lib/source-visite";
import { formaterTelephone, numeroWhatsApp } from "@/lib/telephone";
import { euros } from "@/lib/texte";
import { libelleCreneau } from "./creneaux";
import type { DemandeReservation } from "./schema";
import { vehiculeDevis } from "./voiture";

/** Photo jointe à la demande (le contenu reste dans `envoi.ts`). */
export type PhotoJointe = { champ: string; libelle: string; nomFichier: string; type: string; octets: number };

/** Tout ce qu'il faut pour écrire les e-mails d'une demande validée. */
export type DemandePreparee = {
  reference: string;
  /** Référence de secours : le compteur Netlify Blobs n'a pas répondu. */
  referenceSecours: boolean;
  recueLe: Date;
  demande: DemandeReservation;
  zone: ZoneTarif;
  /** Devis recalculé par le serveur : estimation, ou « sur demande » hors zone. */
  devis: ResultatDevis;
  photos: readonly PhotoJointe[];
};

export type Courriel = { objet: string; html: string; texte: string };

// ---------------------------------------------------------------------------
// Sécurité du contenu
// ---------------------------------------------------------------------------

const ENTITES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Échappe un texte pour le HTML (contenu et attributs). */
export function echapperHtml(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ENTITES[c]!);
}

const SEPARATEUR_INVISIBLE = "\u200B";

/**
 * Désamorce les adresses web dans un texte saisi (« exemple.fr »,
 * « https://… ») avec un séparateur invisible : les messageries ne les
 * transforment plus en liens. « St. Pierre » reste intact.
 */
export function neutraliserLiens(texte: string): string {
  return texte
    .replace(/:\/\//g, `:${SEPARATEUR_INVISIBLE}//`)
    .replace(/\.(?=[\p{L}\p{N}])/gu, `.${SEPARATEUR_INVISIBLE}`);
}

/** Objet d'e-mail : une seule ligne, sans caractère de contrôle, 200 caractères au plus. */
export function ligneObjet(texte: string): string {
  return texte
    .replace(/[\p{Cc}\u2028\u2029]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ---------------------------------------------------------------------------
// Blocs communs aux versions HTML et texte
// ---------------------------------------------------------------------------

type Bloc =
  | { type: "titre"; texte: string }
  | { type: "paragraphe"; texte: string; alerte?: boolean }
  | { type: "lignes"; lignes: readonly (readonly [string, string])[] }
  | { type: "liste"; elements: readonly string[]; ordonnee?: boolean }
  | { type: "bouton"; texte: string; href: string };

const COULEURS = {
  nuit: "#0b1220",
  aqua: "#2ee6d6",
  lagon: "#0e7c74",
  ecume: "#f3fafc",
  ardoise: "#5b6b7f",
  ambre: "#8a5300",
  filet: "#dbe7ee",
} as const;

function blocHtml(bloc: Bloc): string {
  const e = echapperHtml;
  switch (bloc.type) {
    case "titre":
      return `<h2 style="margin:24px 0 8px;font-size:17px;line-height:1.3;color:${COULEURS.lagon};">${e(bloc.texte)}</h2>`;
    case "paragraphe":
      return bloc.alerte
        ? `<p style="margin:12px 0;padding:10px 12px;border-radius:8px;background:#fff4e0;color:${COULEURS.ambre};font-weight:bold;">${e(bloc.texte)}</p>`
        : `<p style="margin:8px 0;">${e(bloc.texte)}</p>`;
    case "lignes":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${bloc.lignes
        .map(
          ([libelle, valeur]) =>
            `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid ${COULEURS.filet};color:${COULEURS.ardoise};vertical-align:top;width:40%;">${e(libelle)}</td><td style="padding:6px 0;border-bottom:1px solid ${COULEURS.filet};vertical-align:top;">${e(valeur)}</td></tr>`,
        )
        .join("")}</table>`;
    case "liste": {
      const balise = bloc.ordonnee ? "ol" : "ul";
      return `<${balise} style="margin:8px 0;padding-left:20px;">${bloc.elements.map((x) => `<li style="margin:4px 0;">${e(x)}</li>`).join("")}</${balise}>`;
    }
    case "bouton":
      return `<p style="margin:16px 0;"><a href="${e(bloc.href)}" style="display:inline-block;background:${COULEURS.lagon};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px;">${e(bloc.texte)}</a></p>`;
  }
}

function blocTexte(bloc: Bloc): string {
  switch (bloc.type) {
    case "titre":
      return `\n${bloc.texte}\n${"-".repeat(bloc.texte.length)}`;
    case "paragraphe":
      return bloc.alerte ? `/!\\ ${bloc.texte}` : bloc.texte;
    case "lignes":
      return bloc.lignes.map(([libelle, valeur]) => `${libelle} : ${valeur}`).join("\n");
    case "liste":
      return bloc.elements.map((x, i) => `${bloc.ordonnee ? `${i + 1}.` : "-"} ${x}`).join("\n");
    case "bouton":
      return `${bloc.texte} : ${bloc.href}`;
  }
}

function mettreEnPage(titre: string, sousTitre: string, blocs: readonly Bloc[]): { html: string; texte: string } {
  const e = echapperHtml;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(titre)}</title></head>
<body style="margin:0;padding:0;background:${COULEURS.ecume};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COULEURS.ecume};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${COULEURS.nuit};">
<tr><td style="background:${COULEURS.nuit};padding:20px 24px;border-radius:12px 12px 0 0;"><div style="font-size:20px;font-weight:bold;color:#ffffff;">${e(site.nom)}</div><div style="font-size:14px;color:${COULEURS.aqua};">${e(sousTitre)}</div></td></tr>
<tr><td style="padding:8px 24px 24px;">
${blocs.map(blocHtml).join("\n")}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  const texte = [`${site.nom} · ${sousTitre}`, ...blocs.map(blocTexte)].join("\n\n").replace(/\n{3,}/g, "\n\n");
  return { html, texte: `${texte.trim()}\n` };
}

// ---------------------------------------------------------------------------
// Contenu de la demande
// ---------------------------------------------------------------------------

/** Texte saisi par le client, désamorcé. */
const saisi = (texte: string) => neutraliserLiens(texte);

function montantLigne(l: LigneDevis): string {
  if (l.type === "offert") return "Offert";
  if (l.type === "a-confirmer" && l.fourchette) {
    return `+${euros(l.fourchette.min)} à ${euros(l.fourchette.max)}, à confirmer sur vos photos`;
  }
  if (l.type === "deplacement" && l.montant === 0) return "Inclus";
  if (l.montant < 0) return `−${euros(-l.montant)}`;
  return euros(l.montant);
}

const LIBELLES_ZONE: Record<ZoneTarif, string> = { zone1: "zone 1", zone2: "zone 2", "hors-zone": "hors zone" };

function blocsVoitures(d: DemandePreparee, titreSeule: string): Bloc[] {
  const plusieurs = d.demande.voitures.length > 1;
  return d.demande.voitures.flatMap((v, i): Bloc[] => {
    const f = trouverFormule(v.formule);
    const g = GABARITS.find((x) => x.code === v.gabarit)!;
    const selection = vehiculeDevis(v).options ?? {};
    const options = OPTIONS.flatMap((o) => {
      const q = selection[o.id];
      return q ? [o.unite ? `${o.libelle} × ${q}` : o.libelle] : [];
    });
    return [
      { type: "titre", texte: plusieurs ? `Voiture ${i + 1}` : titreSeule },
      {
        type: "lignes",
        lignes: [
          ["Modèle", saisi(v.modele)],
          ["Gabarit", `${g.code} · ${g.libelle}`],
          ["État", libelleDe(ETATS_VEHICULE, v.etat)],
          ["Animaux", libelleDe(ANIMAUX, v.animaux)],
          ["Sièges enfants", String(v.siegesEnfant)],
          ["Formule", v.abonnement ? `${f.nom}, en abonnement` : f.nom],
          ["Options", options.length > 0 ? options.join(" · ") : "Aucune"],
        ],
      },
    ];
  });
}

function blocsDevis(d: DemandePreparee): Bloc[] {
  const r = d.devis;
  if (r.statut === "sur-demande") {
    return [
      { type: "titre", texte: "Estimation" },
      { type: "paragraphe", texte: `Hors zone : ${r.message.toLowerCase()}. Prix à établir.` },
    ];
  }
  if (r.statut !== "estimation") return [{ type: "titre", texte: "Estimation" }, { type: "paragraphe", texte: r.message }];
  const blocs: Bloc[] = [
    { type: "titre", texte: `Estimation : ${euros(r.total)}` },
    {
      type: "lignes",
      // « Déplacement en zone 1 : inclus » : le montant dit déjà « Inclus ».
      lignes: r.lignes.map((l) => [l.libelle.replace(/ : inclus$/, ""), montantLigne(l)] as const),
    },
  ];
  if (r.aConfirmer) {
    blocs.push({
      type: "paragraphe",
      texte: `+ ${euros(r.aConfirmer.min)} à ${euros(r.aConfirmer.max)} à confirmer sur vos photos, hors total.`,
    });
  }
  const remarques = [
    ...r.optionsRefusees.map(
      (o) =>
        `${OPTIONS.find((x) => x.id === o.option)?.libelle ?? o.option} : non comptée (${o.raison.charAt(0).toLowerCase()}${o.raison.slice(1)}).`,
    ),
    ...r.avertissements.map((a) => a.message),
  ];
  if (remarques.length > 0) blocs.push({ type: "liste", elements: remarques });
  blocs.push({ type: "paragraphe", texte: `${MENTION_ESTIMATION} ${site.mentionTva}.` });
  return blocs;
}

function blocsLieu(d: DemandePreparee): Bloc[] {
  const { lieu } = d.demande;
  const messages = [
    lieu.emplacement === "copropriete" ? MESSAGE_COPROPRIETE : null,
    lieu.prise === "non" ? MESSAGE_SANS_PRISE : null,
  ].filter((m): m is string => m !== null);
  return [
    { type: "titre", texte: "Le lieu" },
    {
      type: "lignes",
      lignes: [
        ["Adresse", saisi(lieu.adresse)],
        ["Commune", `${saisi(lieu.commune)} (${LIBELLES_ZONE[d.zone]})`],
        ["Emplacement", libelleDe(TYPES_EMPLACEMENT, lieu.emplacement)],
        [`Prise à moins de ${CONDITIONS.priseElectriqueMetres} m`, libelleDe(REPONSES_PRISE, lieu.prise)],
      ],
    },
    ...(messages.length > 0 ? [{ type: "liste", elements: messages } as const] : []),
  ];
}

function blocsCreneaux(d: DemandePreparee, titre: string): Bloc[] {
  return [
    { type: "titre", texte: titre },
    { type: "liste", ordonnee: true, elements: d.demande.creneaux.map(libelleCreneau) },
  ];
}

function libellePaiement(d: DemandePreparee): string {
  const mode = MODES_PAIEMENT.find((m) => m.id === d.demande.paiement)!;
  return `${mode.libelle} (${mode.moyens.join(", ")})`;
}

/** Lien WhatsApp prérempli pour répondre au client, avec la référence. */
export function lienWhatsAppClient(telephone: string, prenom: string, reference: string): string | null {
  const numero = numeroWhatsApp(telephone);
  if (!numero) return null;
  const message = `Bonjour ${prenom}, ici ${site.nom}, au sujet de votre demande ${reference}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

/** Lien WhatsApp du client vers nous, pour envoyer ses photos. `null` si notre numéro n'est pas renseigné. */
export function lienWhatsAppPhotos(reference: string): string | null {
  return lienWhatsApp(`Bonjour ${site.nom}, voici les photos de ma demande ${reference}.`);
}

// ---------------------------------------------------------------------------
// E-mail aux associés
// ---------------------------------------------------------------------------

/** E-mail aux deux associés : récapitulatif complet, lien WhatsApp pour répondre au client. */
export function courrielAssocies(d: DemandePreparee): Courriel {
  const { coordonnees, lieu, validation, source } = d.demande;
  const total = d.devis.statut === "estimation" ? euros(d.devis.total) : "sur demande";
  const objet = ligneObjet(
    `Nouvelle demande ${d.reference} · ${coordonnees.prenom} · ${lieu.commune} · ${total}${d.referenceSecours ? " · référence de secours" : ""}`,
  );
  const whatsapp = lienWhatsAppClient(coordonnees.telephone, coordonnees.prenom, d.reference);
  const lignesSource = LIBELLES_SOURCE.flatMap(({ cle, libelle }) => {
    const valeur = source[cle];
    return valeur ? [[libelle, saisi(valeur)] as const] : [];
  });

  const blocs: Bloc[] = [
    {
      type: "lignes",
      lignes: [
        ["Référence", d.reference],
        ["Reçue le", formaterDateHeureParis(d.recueLe)],
      ],
    },
    ...(d.referenceSecours
      ? [
          {
            type: "paragraphe",
            alerte: true,
            texte:
              "Référence de secours : le compteur Netlify Blobs n'a pas répondu. Vérifiez qu'elle n'a pas déjà servi avant de la communiquer.",
          } as const,
        ]
      : []),
    ...(whatsapp ? [{ type: "bouton", texte: "Répondre au client sur WhatsApp", href: whatsapp } as const] : []),
    { type: "titre", texte: "Client" },
    {
      type: "lignes",
      lignes: [
        ["Prénom", saisi(coordonnees.prenom)],
        ["Téléphone", formaterTelephone(coordonnees.telephone)],
        ["E-mail", coordonnees.email],
        [QUESTION_CONNAISSANCE, libelleDe(SOURCES_CONNAISSANCE, coordonnees.connaissance) || "Non précisé"],
        ["Code saisi", coordonnees.code || "Aucun"],
        ["Accepte de recevoir nos offres", validation.offres ? "Oui" : "Non"],
      ],
    },
    ...blocsDevis(d),
    ...blocsVoitures(d, "Voiture"),
    ...blocsLieu(d),
    ...blocsCreneaux(d, "Créneaux souhaités, par ordre de préférence"),
    { type: "titre", texte: "Paiement prévu" },
    { type: "paragraphe", texte: libellePaiement(d) },
    { type: "titre", texte: "Photos" },
    d.photos.length > 0
      ? { type: "liste", elements: d.photos.map((p) => `${p.libelle} : en pièce jointe (${p.nomFichier})`) }
      : { type: "paragraphe", texte: "Aucune photo jointe : le client peut les envoyer sur WhatsApp." },
    { type: "titre", texte: "Source de la visite" },
    lignesSource.length > 0
      ? { type: "lignes", lignes: lignesSource }
      : { type: "paragraphe", texte: "Aucune information (visite directe ou source inconnue)." },
    { type: "titre", texte: "Accords" },
    {
      type: "liste",
      elements: [
        "Conditions générales de vente acceptées",
        "Exécution avant la fin du délai de rétractation demandée",
        "Traitement des données pour la demande accepté",
      ],
    },
  ];

  return { objet, ...mettreEnPage(objet, `Nouvelle demande ${d.reference}`, blocs) };
}

// ---------------------------------------------------------------------------
// E-mail au client
// ---------------------------------------------------------------------------

/** E-mail de confirmation au client : référence, récapitulatif, rappels et contacts. Sans pièce jointe. */
export function courrielClient(d: DemandePreparee): Courriel {
  const { coordonnees, lieu } = d.demande;
  const objet = ligneObjet(`Demande reçue · ${d.reference} · ${site.nom}`);
  const whatsappPhotos = lienWhatsAppPhotos(d.reference);
  const libellesPhotos = PHOTOS_DEMANDEES.map((p) => p.libelle.toLowerCase()).join(", ");

  const blocs: Bloc[] = [
    { type: "paragraphe", texte: `Bonjour ${saisi(coordonnees.prenom)},` },
    { type: "paragraphe", texte: MESSAGE_DEMANDE_RECUE },
    { type: "paragraphe", texte: `Votre référence : ${d.reference}. Rappelez-la dans vos messages.` },
    ...blocsDevis(d),
    ...blocsVoitures(d, "Votre voiture"),
    { type: "titre", texte: "Le lieu" },
    {
      type: "lignes",
      lignes: [
        ["Adresse", saisi(lieu.adresse)],
        ["Commune", saisi(lieu.commune)],
        ["Emplacement", libelleDe(TYPES_EMPLACEMENT, lieu.emplacement)],
      ],
    },
    ...blocsCreneaux(d, "Vos créneaux, par ordre de préférence"),
    { type: "titre", texte: "Paiement" },
    { type: "paragraphe", texte: libellePaiement(d) },
    { type: "paragraphe", texte: RAPPEL_PAIEMENT },
  ];

  if (d.photos.length === 0) {
    blocs.push(
      { type: "titre", texte: "Vos photos" },
      {
        type: "paragraphe",
        texte: `Envoyez-nous trois photos (${libellesPhotos}) en rappelant votre référence : nous confirmons le prix ferme à partir d'elles.`,
      },
      whatsappPhotos
        ? { type: "bouton", texte: "Envoyer mes photos sur WhatsApp", href: whatsappPhotos }
        : { type: "paragraphe", texte: `WhatsApp : ${ouACompleter(site.whatsapp, "numéro WhatsApp")}` },
    );
  }

  blocs.push(
    { type: "titre", texte: "Avant le rendez-vous" },
    { type: "liste", elements: RAPPELS_RENDEZ_VOUS },
    { type: "titre", texte: "Nous contacter" },
    {
      type: "lignes",
      lignes: [
        ["Téléphone", ouACompleter(site.telephone, "téléphone")],
        [
          "WhatsApp",
          estRenseigne(site.whatsapp)
            ? formaterTelephone(`+${site.whatsapp.replace(/\D/g, "")}`)
            : ouACompleter(site.whatsapp, "numéro WhatsApp"),
        ],
        ["E-mail", ouACompleter(site.email, "e-mail")],
      ],
    },
    { type: "paragraphe", texte: `${site.nom} · ${site.promesse}` },
  );

  return { objet, ...mettreEnPage(objet, `Demande reçue · ${d.reference}`, blocs) };
}

// ---------------------------------------------------------------------------
// Mode d'envoi
// ---------------------------------------------------------------------------

export type ConfigurationEnvoi = {
  /** RESEND_API_KEY, lue à l'exécution côté serveur. */
  cle: string;
  /** RESERVATION_EXPEDITEUR, par exemple « Allée Nette <reservation@votre-domaine.fr> ». */
  expediteur: string;
  /** Adresses des associés renseignées dans config/site.ts. */
  destinataires: readonly string[];
  production: boolean;
};

/**
 * - « demo » : pas de clé Resend hors production. Aucun e-mail, la demande
 *   est acceptée (aperçus Netlify, local, tests de bout en bout).
 * - « non-configure » : en production sans clé, ou sans expéditeur ni
 *   destinataire. La demande est refusée (503) : mieux vaut le dire que la perdre.
 * - « envoi » : tout est prêt.
 */
export function modeEnvoi(config: ConfigurationEnvoi): "demo" | "non-configure" | "envoi" {
  if (!estRenseigne(config.cle)) return config.production ? "non-configure" : "demo";
  if (!estRenseigne(config.expediteur) || config.destinataires.length === 0) return "non-configure";
  return "envoi";
}
