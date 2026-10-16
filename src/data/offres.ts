/**
 * Formules, options, prix, zones, abonnements et offres d'Allée Nette.
 *
 * SOURCE UNIQUE : changer un prix ici le change partout (cartes, calculateur,
 * FAQ, données structurées, e-mails). Tous les prix sont TTC, en euros.
 * La mention de TVA vit dans `config/site.ts` (site.mentionTva).
 */

// ---------------------------------------------------------------------------
// Gabarits
// ---------------------------------------------------------------------------

export type Gabarit = "S" | "M" | "L";

export type InfoGabarit = { code: Gabarit; libelle: string; libelleCourt: string; exemples: string };

export const GABARITS: readonly InfoGabarit[] = [
  { code: "S", libelle: "Citadine", libelleCourt: "citadine", exemples: "Clio, 208, Yaris…" },
  {
    code: "M",
    libelle: "Compacte, berline ou petit SUV",
    libelleCourt: "compacte ou berline",
    exemples: "Golf, 308, Captur…",
  },
  {
    code: "L",
    libelle: "Grand SUV, monospace, 7 places, break long, cabine d'utilitaire",
    libelleCourt: "grand SUV ou monospace",
    exemples: "5008, Espace, Berlingo…",
  },
];

export const CODES_GABARIT: readonly Gabarit[] = ["S", "M", "L"];

// ---------------------------------------------------------------------------
// Formules
// ---------------------------------------------------------------------------

export type FormuleId = "interieur-net" | "complet" | "grand-soin" | "pret-a-vendre";

export type Formule = {
  id: FormuleId;
  nom: string;
  /** Nom raccourci pour les messages : « Le Grand Soin ». */
  nomCourt: string;
  /** Positionnement court : « entrée de gamme », « notre formule principale »… */
  positionnement: string;
  prix: Record<Gabarit, number>;
  duree: string;
  /** Temps de séchage après la prestation, s'il y en a un. */
  sechage?: string;
  inclus: readonly string[];
  nonInclus: readonly string[];
  argument: string;
  aSavoir?: string;
  /** La formule comprend le lavage extérieur (soumis à la météo). */
  avecExterieur: boolean;
  /** Page détaillée de la formule. */
  page: string;
};

export const FORMULES: readonly Formule[] = [
  {
    id: "interieur-net",
    nom: "L'Intérieur Net",
    nomCourt: "L'Intérieur Net",
    positionnement: "entrée de gamme",
    prix: { S: 59, M: 69, L: 79 },
    duree: "1 h 15 à 1 h 45",
    inclus: [
      "Aspiration complète : sièges, moquettes, tapis, coffre",
      "Tableau de bord et consoles",
      "Contre-portes et seuils de portes",
      "Vitres intérieures",
    ],
    nonInclus: ["Shampooing", "Poils incrustés", "Taches"],
    argument: "À la station, c'est vous qui travaillez 45 minutes. Ici, vous ne bougez pas.",
    avecExterieur: false,
    page: "/nettoyage-interieur-voiture-domicile",
  },
  {
    id: "complet",
    nom: "Le Complet",
    nomCourt: "Le Complet",
    positionnement: "notre formule principale",
    prix: { S: 109, M: 119, L: 129 },
    duree: "2 h 30 à 3 h 15",
    inclus: [
      "Tout L'Intérieur Net",
      "Lavage extérieur sans rinçage",
      "Jantes, face visible",
      "Vitres extérieures",
      "Plastiques extérieurs",
    ],
    nonInclus: ["Boue épaisse", "Goudron", "Décontamination", "Polissage", "Moteur"],
    argument: "Votre samedi est à vous : on vient, vous récupérez une voiture propre.",
    avecExterieur: true,
    page: "/lavage-exterieur-sans-rincage",
  },
  {
    id: "grand-soin",
    nom: "Le Grand Soin Intérieur",
    nomCourt: "Le Grand Soin",
    positionnement: "approfondi",
    prix: { S: 109, M: 119, L: 139 },
    duree: "3 h à 4 h",
    sechage: "2 à 6 h de séchage",
    inclus: [
      "Tout L'Intérieur Net",
      "Injection-extraction des sièges, moquettes et tapis",
      "Détachage",
      "Cuir nettoyé et nourri",
      "Désodorisation",
    ],
    nonInclus: [
      "Polissage",
      "Odeur de tabac ancienne",
      "Taches anciennes ou de javel",
      "Brûlures",
      "Ciel de toit fragile",
    ],
    aSavoir:
      "La voiture reste humide quelques heures : prévoyez de ne pas l'utiliser, vitres entrouvertes si possible.",
    argument: "Rendez votre voiture saine pour la famille, ou vendez-la plus facilement.",
    avecExterieur: false,
    page: "/nettoyage-interieur-voiture-domicile",
  },
  {
    id: "pret-a-vendre",
    nom: "Prêt à vendre ou à rendre",
    nomCourt: "Prêt à vendre",
    positionnement: "vente ou restitution de location",
    prix: { S: 129, M: 139, L: 159 },
    duree: "Environ 3 h 40",
    sechage: "puis séchage",
    inclus: ["Tout Le Grand Soin Intérieur", "6 photos d'annonce prises sur place"],
    nonInclus: [
      "Polissage",
      "Odeur de tabac ancienne",
      "Taches anciennes ou de javel",
      "Brûlures",
      "Ciel de toit fragile",
    ],
    aSavoir:
      "La voiture reste humide quelques heures : prévoyez de ne pas l'utiliser, vitres entrouvertes si possible.",
    argument: "Des photos d'annonce qui donnent envie, ou une voiture rendue propre avec photos datées.",
    avecExterieur: false,
    page: "/pret-a-vendre-ou-a-rendre",
  },
];

export function formule(id: FormuleId): Formule {
  const f = FORMULES.find((x) => x.id === id);
  if (!f) throw new Error(`Formule inconnue : ${id}`);
  return f;
}

// ---------------------------------------------------------------------------
// Options et suppléments
// ---------------------------------------------------------------------------

export type OptionId =
  | "poils-moderes"
  | "poils-importants"
  | "siege-enfant"
  | "shampooing-avant"
  | "shampooing-cinq"
  | "cuir"
  | "desodorisation"
  | "detachage"
  | "tres-sale"
  | "exterieur-seul";

export type OptionTarif = {
  id: OptionId;
  libelle: string;
  /** Prix fixe, ou fourchette pour un montant fixé sur photo. */
  prix: number | { min: number; max: number };
  /** Option facturée à l'unité (sièges, zones), avec quantités permises. */
  unite?: { singulier: string; pluriel: string; min: number; max: number };
  /** Formules qui comprennent déjà cette prestation : option indisponible. */
  dejaIncluseDans?: readonly FormuleId[];
  /** Options qui ne peuvent pas être cochées en même temps. */
  exclusiveAvec?: readonly OptionId[];
  /** Montant confirmé sur photos : affiché en fourchette, exclu du total. */
  aConfirmerSurPhotos?: boolean;
  /** Accord des messages : « déjà incluse » plutôt que « déjà inclus ». */
  feminin?: boolean;
  /** Règle affichée dans la grille des tarifs. */
  regle: string;
};

const SOINS_INCLUS: readonly FormuleId[] = ["grand-soin", "pret-a-vendre"];

export const OPTIONS: readonly OptionTarif[] = [
  {
    id: "poils-moderes",
    libelle: "Poils d'animaux, quantité modérée",
    prix: 25,
    exclusiveAvec: ["poils-importants"],
    regle: "Toutes formules",
  },
  {
    id: "poils-importants",
    libelle: "Poils d'animaux, quantité importante",
    prix: 45,
    exclusiveAvec: ["poils-moderes"],
    regle: "Toutes formules",
  },
  {
    id: "siege-enfant",
    libelle: "Siège enfant démonté et nettoyé",
    prix: 15,
    unite: { singulier: "siège", pluriel: "sièges", min: 1, max: 3 },
    regle: "Toutes formules, 1 à 3 sièges",
  },
  {
    id: "shampooing-avant",
    libelle: "Shampooing des sièges avant",
    prix: 25,
    dejaIncluseDans: SOINS_INCLUS,
    exclusiveAvec: ["shampooing-cinq"],
    regle: "Déjà inclus dans Le Grand Soin et Prêt à vendre",
  },
  {
    id: "shampooing-cinq",
    libelle: "Shampooing des cinq sièges",
    prix: 45,
    dejaIncluseDans: SOINS_INCLUS,
    exclusiveAvec: ["shampooing-avant"],
    regle: "Déjà inclus dans Le Grand Soin et Prêt à vendre ; remplace le shampooing des sièges avant",
  },
  {
    id: "cuir",
    libelle: "Cuir nettoyé et nourri",
    prix: 39,
    dejaIncluseDans: SOINS_INCLUS,
    regle: "Déjà inclus dans Le Grand Soin et Prêt à vendre",
  },
  {
    id: "desodorisation",
    libelle: "Désodorisation",
    prix: 20,
    feminin: true,
    dejaIncluseDans: SOINS_INCLUS,
    regle: "Déjà incluse dans Le Grand Soin et Prêt à vendre",
  },
  {
    id: "detachage",
    libelle: "Détachage ponctuel",
    prix: 15,
    unite: { singulier: "zone", pluriel: "zones", min: 1, max: 5 },
    dejaIncluseDans: SOINS_INCLUS,
    regle: "Par zone ; déjà inclus dans Le Grand Soin et Prêt à vendre",
  },
  {
    id: "tres-sale",
    libelle: "Véhicule très sale (sable, boue, déchets)",
    prix: { min: 25, max: 45 },
    aConfirmerSurPhotos: true,
    regle: "Montant fixé sur vos photos, avant le rendez-vous",
  },
  {
    id: "exterieur-seul",
    libelle: "Extérieur seul sans rinçage",
    prix: 55,
    dejaIncluseDans: ["complet"],
    regle: "Uniquement en complément, ou lors d'une tournée déjà prévue dans votre secteur",
  },
];

export function option(id: OptionId): OptionTarif {
  const o = OPTIONS.find((x) => x.id === id);
  if (!o) throw new Error(`Option inconnue : ${id}`);
  return o;
}

// ---------------------------------------------------------------------------
// Déplacement
// ---------------------------------------------------------------------------

export type ZoneTarif = "zone1" | "zone2" | "hors-zone";

export const DEPLACEMENT = {
  zone1: { libelle: "Zone 1", supplement: 0, commandeMinimale: 59 },
  zone2: {
    libelle: "Zone 2",
    supplement: 10,
    /** Au moins une de ces formules dans la commande. */
    formulesMinimales: ["complet", "grand-soin", "pret-a-vendre"] as readonly FormuleId[],
  },
  horsZone: { libelle: "Hors zone", vehiculesMinimum: 2 },
} as const;

// ---------------------------------------------------------------------------
// Abonnements : remise sur la formule, arrondie à l'euro inférieur
// ---------------------------------------------------------------------------

export const REMISE_ABONNEMENT_POURCENT = 10;

export type Abonnement = { id: string; formule: FormuleId; frequence: string };

export const ABONNEMENTS: readonly Abonnement[] = [
  { id: "complet-bimestriel", formule: "complet", frequence: "tous les 2 mois" },
  { id: "interieur-net-mensuel", formule: "interieur-net", frequence: "tous les mois" },
];

export const AVANTAGES_ABONNEMENT = ["Sans engagement", "Créneau fixe", "Priorité de réservation"] as const;

/** Prix d'une formule en abonnement : remise appliquée puis arrondi à l'euro inférieur. */
export function prixAbonnement(id: FormuleId, gabarit: Gabarit): number {
  return Math.floor((formule(id).prix[gabarit] * (100 - REMISE_ABONNEMENT_POURCENT)) / 100);
}

export function abonnementPour(id: FormuleId): Abonnement | undefined {
  return ABONNEMENTS.find((a) => a.formule === id);
}

// ---------------------------------------------------------------------------
// Offres commerciales (activables)
// ---------------------------------------------------------------------------

export const OFFRES = {
  lancement: {
    actif: true,
    nom: "Offre de lancement",
    placesTotal: 30,
    /** À mettre à jour à la main après chaque nouveau client. Jamais inventé. */
    placesRestantes: 30,
    /** Désodorisation offerte sur ces formules (déjà incluse dans Le Grand Soin). */
    desodorisationOfferteSur: ["interieur-net", "complet"] as readonly FormuleId[],
    avantages: ["Désodorisation offerte (valeur 20 €)", "Compte rendu photo", "Créneau prioritaire"],
  },
  garage: {
    actif: true,
    code: "GARAGE",
    nom: "Clients de notre garage partenaire",
    description: "Désodorisation ou un siège enfant offert, créneau sous 7 jours",
  },
  parrainage: {
    actif: true,
    nom: "Parrainage",
    remiseParrain: 10,
    remiseFilleul: 10,
    description: "10 € de remise pour le parrain et 10 € pour le filleul, après la prestation payée du filleul",
  },
  rueGroupee: {
    actif: true,
    code: "VOISIN",
    nom: "Rue groupée",
    remiseParClient: 10,
    description: "Deux voisins le même jour : 10 € de remise chacun",
  },
  deuxVoitures: {
    actif: true,
    nom: "Deux voitures à la même adresse",
    remiseDeuxieme: 15,
    description: "15 € de remise sur la deuxième",
  },
  professionnels: {
    actif: true,
    nom: "Professionnels",
    vehiculesMinimum: 3,
    remisePourcent: 10,
    description: "Trois véhicules ou plus lors d'une même visite : 10 % de remise",
  },
  bonCadeau: {
    actif: true,
    nom: "Bon cadeau",
    validiteMois: 12,
    montantLibre: { min: 50, max: 300 },
    description: "Au prix normal, valable 12 mois",
  },
} as const;

// ---------------------------------------------------------------------------
// Garantie Retouche 24 h
// ---------------------------------------------------------------------------

export const GARANTIE = {
  nom: "Garantie Retouche 24 h",
  texte:
    "Un point inclus dans votre formule ne vous convient pas ? Envoyez-nous une photo dans les 24 heures : nous revenons le reprendre gratuitement.",
  limites: ["Un seul retour par prestation", "En zone 1 uniquement"],
  exclusions: [
    "Défauts présents avant la prestation et photographiés à l'arrivée",
    "Taches signalées comme non récupérables",
    "Odeurs de tabac anciennes",
    "Saleté apparue après la prestation",
  ],
} as const;

// ---------------------------------------------------------------------------
// Pack Utilitaires Artisan (page Professionnels)
// ---------------------------------------------------------------------------

export const PACK_ARTISAN = {
  nom: "Pack Utilitaires Artisan",
  prixParVehicule: 95,
  remisePourcent: 10,
  vehiculesPourRemise: 3,
  contenu: [
    "Aspiration et nettoyage complet de la cabine : sièges, tableau de bord, portières, vitres",
    "Extérieur sans rinçage",
    "Jantes",
  ],
  rythme: "Mensuel ou bimestriel, le samedi matin",
  facturation: "Facture mensuelle payable à 30 jours, résiliation sans frais avec un mois de préavis",
} as const;

// ---------------------------------------------------------------------------
// Repères calculés
// ---------------------------------------------------------------------------

/** Prix le plus bas de la grille (pour les seules mentions « dès »). */
export function prixMinimum(): number {
  return Math.min(...FORMULES.flatMap((f) => Object.values(f.prix)));
}

/** Prix le plus haut de la grille (pour la fourchette des données structurées). */
export function prixMaximum(): number {
  return Math.max(...FORMULES.flatMap((f) => Object.values(f.prix)));
}
