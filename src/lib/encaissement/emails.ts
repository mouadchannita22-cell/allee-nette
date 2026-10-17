/**
 * E-mails de paiement à l'associé qui encaisse (partie 10.4 du brief) :
 * paiement reçu, ou paiement différé échoué. Fonctions pures, testées ;
 * l'envoi se fait dans `envoi.ts`, avec l'expéditeur des réservations.
 *
 * Aucune donnée bancaire ni coordonnée du client : référence, montant,
 * moyen de paiement, date et identifiant chez le prestataire suffisent pour
 * rapprocher le paiement de la demande et envoyer la facture.
 */
import { ouACompleter, site, type Encaisseur } from "@/config/site";
import { formaterDateHeureParis } from "@/lib/date-paris";
import { formaterEuros } from "@/lib/montant";
import { ligneObjet, mettreEnPage, type Bloc, type Courriel } from "@/lib/reservation/emails";

/** Paiement à signaler à l'associé. */
export type PaiementNotifie = {
  reference: string;
  encaisseur: Encaisseur;
  /** Montant en centimes, `null` s'il est inconnu. */
  centimes: number | null;
  /** Code de devise ISO (« eur »). */
  devise: string;
  /** Moyen de paiement lisible (« Carte bancaire via Apple Pay (card) »). */
  moyen: string;
  date: Date;
  prestataire: "Stripe" | "PayPal";
  /** Identifiant chez le prestataire : session Checkout (cs_…) ou capture PayPal. */
  identifiant: string;
  /** Mode test (Stripe) ou bac à sable (PayPal) : aucun argent réel. */
  test: boolean;
};

/** « 119,50 € », ou le montant brut dans une autre devise. */
export function montantNotifie(p: Pick<PaiementNotifie, "centimes" | "devise">): string {
  if (p.centimes === null) return "Non précisé";
  if (p.devise.toLowerCase() === "eur") return formaterEuros(p.centimes);
  return `${(p.centimes / 100).toFixed(2)} ${p.devise.toUpperCase()}`;
}

function lignes(p: PaiementNotifie): Bloc {
  const associe = site.associes[p.encaisseur];
  return {
    type: "lignes",
    lignes: [
      ["Référence", p.reference],
      ["Montant", montantNotifie(p)],
      ["Moyen de paiement", p.moyen],
      ["Date", formaterDateHeureParis(p.date)],
      ["Encaissé par", `${ouACompleter(associe.prenomNom, `nom de l'associé ${p.encaisseur}`)} (encaisseur ${p.encaisseur})`],
      ["Prestataire", p.prestataire],
      [p.prestataire === "Stripe" ? "Identifiant de la session" : "Identifiant de la capture", p.identifiant],
    ],
  };
}

const MODE_TEST: Bloc = {
  type: "paragraphe",
  alerte: true,
  texte: "Mode test : aucun argent réel n'a été encaissé.",
};

/** Paiement reçu : l'associé rapproche la référence de la demande et envoie la facture. */
export function courrielPaiementRecu(p: PaiementNotifie): Courriel {
  const objet = ligneObjet(
    `${p.test ? "[TEST] " : ""}Paiement reçu ${p.reference} · ${montantNotifie(p)} · ${p.prestataire}`,
  );
  const blocs: Bloc[] = [
    ...(p.test ? [MODE_TEST] : []),
    { type: "paragraphe", texte: `Le client a réglé la prestation ${p.reference} en ligne.` },
    lignes(p),
    { type: "titre", texte: "À faire" },
    {
      type: "liste",
      elements: [
        "Rapprocher la référence de la demande de réservation.",
        "Envoyer la facture au client par e-mail (le site l'a annoncée).",
        `Vérifier le paiement dans le tableau de bord ${p.prestataire} en cas de doute.`,
      ],
    },
  ];
  return { objet, ...mettreEnPage(objet, `Paiement reçu · ${p.reference}`, blocs) };
}

/** Paiement différé échoué : rien n'a été encaissé, le client doit être recontacté. */
export function courrielPaiementEchoue(p: PaiementNotifie): Courriel {
  const objet = ligneObjet(`${p.test ? "[TEST] " : ""}Paiement échoué ${p.reference} · ${montantNotifie(p)}`);
  const blocs: Bloc[] = [
    ...(p.test ? [MODE_TEST] : []),
    {
      type: "paragraphe",
      alerte: true,
      texte: `Le paiement de la prestation ${p.reference} a échoué : rien n'a été encaissé.`,
    },
    lignes(p),
    { type: "titre", texte: "À faire" },
    {
      type: "liste",
      elements: [
        "Prévenir le client que son paiement n'a pas abouti.",
        "Lui envoyer un nouveau lien depuis /admin/lien-paiement, ou lui proposer de payer sur place.",
      ],
    },
  ];
  return { objet, ...mettreEnPage(objet, `Paiement échoué · ${p.reference}`, blocs) };
}
