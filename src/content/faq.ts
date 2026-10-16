/**
 * Questions fréquentes. Les chiffres viennent des données : changer un prix
 * ou une commune met la FAQ (et ses données structurées) à jour.
 */
import { site, zoneActive, communesDesservies } from "@/config/site";
import { CONDITIONS } from "@/data/conditions";
import { DEPLACEMENT, FORMULES, GARANTIE, OFFRES, formaterMinutes, option } from "@/data/offres";

export type QuestionFrequente = {
  id: string;
  question: string;
  reponse: string;
  /** Réponse pas encore validée : marquée à l'écran, exclue des données structurées. */
  aConfirmer?: boolean;
};

const prix = (id: Parameters<typeof option>[0]) => {
  const p = option(id).prix;
  return typeof p === "number" ? p : p.min;
};

const dureeMin = Math.min(...FORMULES.map((f) => f.dureeMinutes[0]));
const dureeMax = Math.max(...FORMULES.map((f) => f.dureeMinutes[1]));
const plusCourte = FORMULES.find((f) => f.dureeMinutes[0] === dureeMin)!;
const plusLongue = FORMULES.find((f) => f.dureeMinutes[1] === dureeMax)!;
const autres = communesDesservies().length - 1;

export const FAQ: readonly QuestionFrequente[] = [
  {
    id: "eau",
    question: "Avez-vous besoin de mon eau ?",
    reponse: `Non. Nous apportons notre eau et lavons l'extérieur sans rinçage : environ ${CONDITIONS.eauLitres} litres, aucun écoulement.`,
  },
  {
    id: "electricite",
    question: "Et de l'électricité ?",
    reponse: `Oui, une prise à moins de ${CONDITIONS.priseElectriqueMetres} mètres de la voiture. Nous avons une rallonge de ${CONDITIONS.rallongeMetres} m.`,
  },
  {
    id: "duree",
    question: "Combien de temps ça dure ?",
    reponse: `De ${formaterMinutes(dureeMin)} pour ${plusCourte.nom} à ${formaterMinutes(dureeMax)} pour ${plusLongue.nomCourt}, selon le gabarit et l'état.`,
  },
  {
    id: "presence",
    question: "Dois-je être présent ?",
    reponse: `${CONDITIONS.presenceMinutes} minutes au début et à la fin. Pensez à retirer vos objets de valeur. Nous ne conduisons jamais votre voiture : si elle doit être déplacée, c'est vous qui la déplacez.`,
  },
  {
    id: "paiement",
    question: "Quand est-ce que je paie ?",
    reponse:
      "Après la prestation, sur place, par carte, sans contact (Apple Pay, Google Pay), PayPal ou espèces. Ou en ligne, par lien sécurisé, une fois le prix confirmé.",
  },
  {
    id: "prix",
    question: "Le prix peut-il changer le jour J ?",
    reponse: `Non. Le prix est ferme, confirmé sur vos photos sous ${CONDITIONS.delaiPrixFermeHeures} heures, avant le rendez-vous. Si la voiture est nettement plus sale que sur les photos, vous choisissez : la formule réservée sans supplément, ou un report. Aucun supplément n'est imposé sur place.`,
  },
  {
    id: "pluie",
    question: "Et s'il pleut ?",
    reponse: "L'intérieur reste possible si la voiture est à l'abri. Sinon, nous reportons sans frais.",
  },
  {
    id: "animaux",
    question: "Mon chien perd ses poils, c'est un problème ?",
    reponse: `Non : un supplément de ${prix("poils-moderes")} ou ${prix("poils-importants")} € selon la quantité, annoncé avant, sur photo.`,
  },
  {
    id: "copropriete",
    question: "J'habite en copropriété.",
    reponse: "C'est possible sur votre place, avec l'accord écrit du syndic ou du règlement.",
  },
  {
    id: "sieges-mouilles",
    question: "Mes sièges seront-ils mouillés ?",
    reponse: "Après un shampooing, oui, quelques heures. Prévoyez de ne pas utiliser la voiture.",
  },
  {
    id: "taches",
    question: "Et si une tache ne part pas ?",
    reponse:
      "Nous vous disons avant, sur photo, ce qui est récupérable. Une tache ancienne peut seulement s'atténuer.",
  },
  {
    id: "zones",
    question: "Quelles zones desservez-vous ?",
    reponse: `${zoneActive.ville} et ${autres} communes alentour, dont ${zoneActive.communesPrincipales
      .filter((c) => c !== zoneActive.ville)
      .join(" et ")}. Déplacement inclus jusqu'à ${zoneActive.rayons.zone1} km, ${DEPLACEMENT.zone2.supplement} € de ${zoneActive.rayons.zone1} à ${zoneActive.rayons.zone2} km. Au-delà, sur demande.`,
  },
  {
    id: "retouche",
    question: "Et si le résultat ne me convient pas ?",
    reponse: `${GARANTIE.texte} Un seul retour par prestation, en zone 1.`,
  },
  {
    id: "annulation",
    question: "Puis-je annuler ?",
    reponse: site.annulation.texte,
    aConfirmer: !site.annulation.confirmee,
  },
  ...(OFFRES.bonCadeau.actif
    ? [
        {
          id: "cadeau",
          question: "Puis-je offrir une prestation ?",
          reponse: `Oui, en bon cadeau valable ${OFFRES.bonCadeau.validiteMois} mois.`,
        },
      ]
    : []),
];

/** Sélection courte pour l'accueil et les pages de prestations. */
export function questions(ids: readonly string[]): QuestionFrequente[] {
  return ids.flatMap((id) => FAQ.filter((q) => q.id === id));
}
