/**
 * Configuration centrale d'Allée Nette.
 *
 * Toutes les informations d'identité, de contact et de zone vivent ici.
 * Une valeur vide ("") s'affiche sur le site comme un emplacement visible
 * « [À COMPLÉTER : …] » jusqu'à ce que vous la renseigniez.
 */

// ---------------------------------------------------------------------------
// Zone active : changez cette seule ligne pour basculer de préréglage.
// ---------------------------------------------------------------------------
export const ZONE_ACTIVE: ZoneId = "saintes";

export type ZoneId = "saintes" | "bordeaux" | "la-rochelle";

export type Commune = {
  nom: string;
  /** Code INSEE, utilisé pour récupérer les contours de la carte. */
  insee: string;
  cp: string;
  /** Distance à vol d'oiseau depuis le point de départ, pour information. */
  km?: number;
};

export type PrereglageZone = {
  /** Ville de référence, utilisée dans les textes (« à Saintes et alentours »). */
  ville: string;
  /** Point de départ approximatif pour la carte. Jamais une adresse. */
  depart: { lon: number; lat: number };
  /** Les trois communes citées dans les titres SEO et le sous-titre du héros. */
  communesPrincipales: readonly [string, string, string];
  /** Rayons affichés dans les textes, en kilomètres. */
  rayons: { zone1: number; zone2: number };
  zone1: readonly Commune[];
  zone2: readonly Commune[];
};

export const PREREGLAGES: Record<ZoneId, PrereglageZone> = {
  saintes: {
    ville: "Saintes",
    depart: { lon: -0.6456, lat: 45.7462 },
    communesPrincipales: ["Saintes", "Chaniers", "Saint-Georges-des-Coteaux"],
    rayons: { zone1: 8, zone2: 20 },
    zone1: [
      { nom: "Saintes", insee: "17415", cp: "17100", km: 0 },
      { nom: "Fontcouverte", insee: "17164", cp: "17100", km: 4.9 },
      { nom: "Bussac-sur-Charente", insee: "17073", cp: "17100", km: 5.2 },
      { nom: "Saint-Georges-des-Coteaux", insee: "17336", cp: "17810", km: 5.2 },
      { nom: "Les Gonds", insee: "17179", cp: "17100", km: 5.3 },
      { nom: "Pessines", insee: "17275", cp: "17810", km: 6.0 },
      { nom: "Chermignac", insee: "17102", cp: "17460", km: 6.6 },
      { nom: "Écurat", insee: "17148", cp: "17810", km: 6.8 },
      { nom: "Chaniers", insee: "17086", cp: "17610", km: 7.0 },
      { nom: "Thénac", insee: "17444", cp: "17460", km: 7.4 },
      { nom: "Nieul-lès-Saintes", insee: "17262", cp: "17810", km: 7.6 },
      { nom: "Courcoury", insee: "17128", cp: "17100", km: 7.8 },
      { nom: "Port-d'Envaux", insee: "17285", cp: "17350", km: 8.0 },
    ],
    zone2: [
      { nom: "Saint-Vaize", insee: "17412", cp: "17100", km: 8.1 },
      { nom: "La Clisse", insee: "17112", cp: "17600", km: 8.6 },
      { nom: "Le Douhet", insee: "17143", cp: "17100", km: 8.6 },
      { nom: "La Chapelle-des-Pots", insee: "17089", cp: "17100", km: 8.6 },
      { nom: "Préguillac", insee: "17289", cp: "17460", km: 8.8 },
      { nom: "Varzay", insee: "17460", cp: "17460", km: 9.1 },
      { nom: "Vénérand", insee: "17462", cp: "17100", km: 9.4 },
      { nom: "Luchat", insee: "17214", cp: "17600", km: 9.6 },
      { nom: "Rétaud", insee: "17296", cp: "17460", km: 10.1 },
      { nom: "Berneuil", insee: "17044", cp: "17460", km: 10.2 },
      { nom: "Plassay", insee: "17280", cp: "17250", km: 10.9 },
      { nom: "Taillebourg", insee: "17436", cp: "17350", km: 11.1 },
      { nom: "La Jard", insee: "17191", cp: "17460", km: 11.2 },
      { nom: "Annepont", insee: "17011", cp: "17350", km: 11.3 },
      { nom: "Les Essards", insee: "17154", cp: "17250", km: 11.4 },
      { nom: "Saint-Sever-de-Saintonge", insee: "17400", cp: "17800", km: 11.5 },
      { nom: "Juicq", insee: "17198", cp: "17770", km: 11.7 },
      { nom: "Soulignonne", insee: "17431", cp: "17250", km: 11.9 },
      { nom: "Saint-Sauvant", insee: "17395", cp: "17610", km: 12.0 },
      { nom: "Dompierre-sur-Charente", insee: "17141", cp: "17610", km: 12.2 },
      { nom: "Corme-Royal", insee: "17120", cp: "17600", km: 12.2 },
      { nom: "Saint-Césaire", insee: "17314", cp: "17770", km: 12.3 },
      { nom: "Pisany", insee: "17278", cp: "17600", km: 12.4 },
      { nom: "Écoyeux", insee: "17147", cp: "17770", km: 12.4 },
      { nom: "Crazannes", insee: "17134", cp: "17350", km: 12.5 },
      { nom: "Tesson", insee: "17441", cp: "17460", km: 12.7 },
      { nom: "Rioux", insee: "17298", cp: "17460", km: 13.0 },
      { nom: "Colombiers", insee: "17115", cp: "17460", km: 13.0 },
      { nom: "Saint-Porchaire", insee: "17387", cp: "17250", km: 13.2 },
      { nom: "Saint-Bris-des-Bois", insee: "17313", cp: "17770", km: 13.6 },
      { nom: "Thézac", insee: "17445", cp: "17600", km: 13.7 },
      { nom: "Rouffiac", insee: "17304", cp: "17800", km: 13.8 },
      { nom: "Saint-Hilaire-de-Villefranche", insee: "17344", cp: "17770", km: 14.3 },
      { nom: "Montils", insee: "17242", cp: "17800", km: 14.5 },
      { nom: "Le Mung", insee: "17252", cp: "17350", km: 14.6 },
      { nom: "Grandjean", insee: "17181", cp: "17350", km: 15.0 },
      { nom: "Brizambourg", insee: "17070", cp: "17770", km: 15.1 },
      { nom: "Geay", insee: "17171", cp: "17250", km: 15.2 },
      { nom: "Montpellier-de-Médillan", insee: "17244", cp: "17260", km: 15.2 },
      { nom: "Saint-Simon-de-Pellouaille", insee: "17404", cp: "17260", km: 15.4 },
      { nom: "Balanzac", insee: "17030", cp: "17600", km: 15.4 },
      { nom: "Saint-Savinien", insee: "17397", cp: "17350", km: 15.4 },
      { nom: "Villars-en-Pons", insee: "17469", cp: "17260", km: 15.5 },
      { nom: "Saint-Léger", insee: "17354", cp: "17800", km: 15.6 },
      { nom: "Chérac", insee: "17100", cp: "17610", km: 15.9 },
      { nom: "Saint-Sulpice-d'Arnoult", insee: "17408", cp: "17250", km: 16.1 },
      { nom: "Fenioux", insee: "17157", cp: "17350", km: 16.6 },
      { nom: "Meursac", insee: "17232", cp: "17120", km: 17.1 },
      { nom: "Saint-Seurin-de-Palenne", insee: "17398", cp: "17800", km: 17.1 },
      { nom: "Brives-sur-Charente", insee: "17069", cp: "17800", km: 17.1 },
      { nom: "Burie", insee: "17072", cp: "17770", km: 17.1 },
      { nom: "Villars-les-Bois", insee: "17470", cp: "17770", km: 17.1 },
      { nom: "Taillant", insee: "17435", cp: "17350", km: 17.2 },
      { nom: "Saint-Romain-de-Benet", insee: "17393", cp: "17600", km: 17.4 },
      { nom: "Romegoux", insee: "17302", cp: "17250", km: 17.6 },
      { nom: "Cravans", insee: "17133", cp: "17260", km: 17.6 },
      { nom: "Bercloux", insee: "17042", cp: "17770", km: 17.8 },
      { nom: "Nantillé", insee: "17256", cp: "17770", km: 17.9 },
      { nom: "Nancras", insee: "17255", cp: "17600", km: 17.9 },
      { nom: "Jazennes", insee: "17196", cp: "17260", km: 18.1 },
      { nom: "Thaims", insee: "17442", cp: "17120", km: 18.4 },
      { nom: "Pérignac", insee: "17273", cp: "17800", km: 18.9 },
      { nom: "Pont-l'Abbé-d'Arnoult", insee: "17284", cp: "17250", km: 19.3 },
      { nom: "Sainte-Gemme", insee: "17330", cp: "17250", km: 19.5 },
      { nom: "Louzac-Saint-André", insee: "16193", cp: "16100", km: 19.6 },
      { nom: "Mazeray", insee: "17226", cp: "17400", km: 19.6 },
      { nom: "Sablonceaux", insee: "17307", cp: "17600", km: 19.6 },
      { nom: "Bougneau", insee: "17056", cp: "17800", km: 19.6 },
      { nom: "Bignay", insee: "17046", cp: "17400", km: 19.7 },
      { nom: "Bords", insee: "17053", cp: "17430", km: 19.7 },
      { nom: "Migron", insee: "17235", cp: "17770", km: 19.7 },
      { nom: "Asnières-la-Giraud", insee: "17022", cp: "17400", km: 19.8 },
      { nom: "Salignac-sur-Charente", insee: "17418", cp: "17800", km: 19.8 },
      { nom: "Pons", insee: "17283", cp: "17800", km: 20.0 },
    ],
  },
  bordeaux: {
    ville: "Pessac",
    depart: { lon: -0.681, lat: 44.786 },
    communesPrincipales: ["Pessac", "Talence", "Mérignac"],
    rayons: { zone1: 8, zone2: 15 },
    zone1: [
      { nom: "Pessac", insee: "33318", cp: "33600" },
      { nom: "Gradignan", insee: "33192", cp: "33170" },
      { nom: "Villenave-d'Ornon", insee: "33550", cp: "33140" },
      { nom: "Talence", insee: "33522", cp: "33400" },
      { nom: "Mérignac", insee: "33281", cp: "33700" },
    ],
    zone2: [
      { nom: "Bègles", insee: "33039", cp: "33130" },
      { nom: "Canéjan", insee: "33090", cp: "33610" },
      { nom: "Cestas", insee: "33122", cp: "33610" },
      { nom: "Léognan", insee: "33238", cp: "33850" },
      { nom: "Le Haillan", insee: "33200", cp: "33185" },
      { nom: "Eysines", insee: "33162", cp: "33320" },
      // Le brief limite Bordeaux aux quartiers sud : à préciser au client sur photo.
      { nom: "Bordeaux", insee: "33063", cp: "33000" },
    ],
  },
  "la-rochelle": {
    ville: "La Rochelle",
    depart: { lon: -1.1522, lat: 46.1851 },
    communesPrincipales: ["La Rochelle", "Lagord", "Puilboreau"],
    rayons: { zone1: 8, zone2: 15 },
    zone1: [
      { nom: "Lagord", insee: "17200", cp: "17140" },
      { nom: "Puilboreau", insee: "17291", cp: "17138" },
      { nom: "Périgny", insee: "17274", cp: "17180" },
      { nom: "Nieul-sur-Mer", insee: "17264", cp: "17137" },
      { nom: "Aytré", insee: "17028", cp: "17440" },
      { nom: "La Rochelle", insee: "17300", cp: "17000" },
    ],
    zone2: [
      { nom: "Dompierre-sur-Mer", insee: "17142", cp: "17139" },
      { nom: "L'Houmeau", insee: "17190", cp: "17137" },
      { nom: "Saint-Xandre", insee: "17414", cp: "17138" },
      { nom: "Sainte-Soulle", insee: "17407", cp: "17220" },
      { nom: "Angoulins", insee: "17010", cp: "17690" },
      { nom: "Marsilly", insee: "17222", cp: "17137" },
      { nom: "Châtelaillon-Plage", insee: "17094", cp: "17340" },
    ],
  },
};

export const zoneActive: PrereglageZone = PREREGLAGES[ZONE_ACTIVE];

// ---------------------------------------------------------------------------
// Identité et contacts
// ---------------------------------------------------------------------------

export type Encaisseur = "A" | "B";

export type Associe = {
  /** « Prénom Nom », tel qu'il apparaît sur la page de paiement et les factures. */
  prenomNom: string;
  siren: string;
  adresse: string;
  email: string;
  telephone: string;
};

export const site = {
  nom: "Allée Nette",
  promesse: "Votre voiture propre, sans quitter la maison.",
  /** URL publique, sans barre finale. Définie par NEXT_PUBLIC_SITE_URL chez l'hébergeur. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),

  /** Numéro affiché, par exemple « 06 12 34 56 78 ». */
  telephone: "",
  /** Numéro WhatsApp au format international sans « + » ni espaces, par exemple « 33612345678 ». */
  whatsapp: "",
  email: "",

  reseaux: {
    instagram: "",
    /** Lien de la fiche Google Business Profile. */
    ficheGoogle: "",
  },

  /** Nombre d'avis Google réels. La section Avis n'apparaît qu'à partir de 5. */
  avisGoogle: { nombre: 0, lien: "" },

  mentionTva: "TVA non applicable, article 293 B du CGI",

  /** Les deux entrepreneurs individuels qui facturent sous le nom commercial Allée Nette. */
  associes: {
    A: { prenomNom: "", siren: "", adresse: "", email: "", telephone: "" },
    B: { prenomNom: "", siren: "", adresse: "", email: "", telephone: "" },
  } satisfies Record<Encaisseur, Associe>,

  hebergeur: {
    raisonSociale: "Netlify, Inc.",
    adresse: "",
    telephone: "",
  },

  mediateur: { nom: "", adresse: "", site: "" },

  /** Pages qui ouvrent après le lancement. `false` : page masquée et hors plan du site. */
  pages: {
    pretAVendre: false,
    professionnels: false,
    bonsCadeaux: false,
  },
} as const;

/** Vrai si une valeur de configuration a été renseignée. */
export function estRenseigne(valeur: string | undefined | null): valeur is string {
  return typeof valeur === "string" && valeur.trim() !== "";
}

/** Valeur à afficher, ou emplacement visible « [À COMPLÉTER : libellé] ». */
export function ouACompleter(valeur: string | undefined | null, libelle: string): string {
  return estRenseigne(valeur) ? valeur : `[À COMPLÉTER : ${libelle}]`;
}

/** Toutes les communes desservies (zones 1 et 2) de la zone active. */
export function communesDesservies(): readonly Commune[] {
  return [...zoneActive.zone1, ...zoneActive.zone2];
}
