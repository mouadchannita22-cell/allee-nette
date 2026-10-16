/**
 * Calculateur de prix d'Allée Nette : fonctions pures, sans effet de bord.
 * Toutes les valeurs viennent de `data/offres.ts`.
 *
 * total = formules + options applicables + déplacement − remises
 */
import {
  DEPLACEMENT,
  GABARITS,
  OFFRES,
  OPTIONS,
  REMISE_ABONNEMENT_POURCENT,
  abonnementPour,
  formule as trouverFormule,
  option as trouverOption,
  prixAbonnement,
  type FormuleId,
  type Gabarit,
  type OptionId,
  type ZoneTarif,
} from "@/data/offres";

export const MENTION_ESTIMATION =
  "Estimation. Votre prix ferme est confirmé sur vos photos sous 2 heures, avant tout rendez-vous.";

export const MESSAGE_ZONE_2 = "En zone 2, choisissez Le Complet ou Le Grand Soin";
export const MESSAGE_HORS_ZONE = "Sur demande, deux véhicules minimum";
export const MESSAGE_METEO =
  "L'extérieur est reporté sans frais en cas de pluie annoncée ou de restriction d'eau.";

/** Options cochées, avec leur quantité (1 pour une option simple). */
export type SelectionOptions = Partial<Record<OptionId, number>>;

export type Vehicule = {
  formule: FormuleId;
  gabarit: Gabarit;
  options?: SelectionOptions;
  /** Abonnement demandé (seulement pour les formules qui en proposent un). */
  abonnement?: boolean;
};

export type EntreeDevis = {
  vehicules: readonly Vehicule[];
  zone: ZoneTarif;
  /** GARAGE, VOISIN, ou un code parrain (référence AN-AAAA-NNNN du parrain). */
  code?: string;
  professionnel?: boolean;
  /** Offre de lancement. Par défaut : active tant qu'il reste des places. */
  offreLancement?: boolean;
};

export type TypeLigne = "formule" | "option" | "offert" | "a-confirmer" | "deplacement" | "remise";

export type LigneDevis = {
  type: TypeLigne;
  libelle: string;
  /** En euros ; négatif pour une remise ; 0 pour une ligne offerte ou à confirmer. */
  montant: number;
  /** Index de la voiture concernée, s'il y en a plusieurs. */
  vehicule?: number;
  /** Fourchette d'un supplément fixé sur photos (exclu du total). */
  fourchette?: { min: number; max: number };
};

export type OptionRefusee = { vehicule: number; option: OptionId; raison: string };

export type Avertissement = {
  code: "abonnement-indisponible" | "meteo-exterieur" | "code-inconnu" | "code-a-verifier" | "garage-creneau";
  message: string;
};

export type ResultatDevis =
  | {
      statut: "estimation";
      total: number;
      lignes: LigneDevis[];
      /** Somme des suppléments à confirmer sur photos, hors total. */
      aConfirmer: { min: number; max: number } | null;
      optionsRefusees: OptionRefusee[];
      avertissements: Avertissement[];
    }
  | { statut: "refuse"; motif: "zone2-formule"; message: string; formulesProposees: FormuleId[] }
  | { statut: "sur-demande"; message: string; vehiculesMinimum: number }
  | { statut: "invalide"; message: string };

// ---------------------------------------------------------------------------
// Aides pour l'interface
// ---------------------------------------------------------------------------

export type Disponibilite = { disponible: true } | { disponible: false; raison: string };

/** Une option est-elle proposée avec cette formule ? Sinon, pourquoi. */
export function disponibilite(formuleId: FormuleId, optionId: OptionId): Disponibilite {
  const o = trouverOption(optionId);
  if (o.dejaIncluseDans?.includes(formuleId)) {
    return {
      disponible: false,
      raison: `Déjà ${o.feminin ? "incluse" : "inclus"} dans ${trouverFormule(formuleId).nomCourt}`,
    };
  }
  return { disponible: true };
}

/**
 * Coche, décoche ou change la quantité d'une option. Cocher une option
 * décoche celles qui lui sont exclusives (shampooing avant / cinq sièges…).
 */
export function basculerOption(selection: SelectionOptions, id: OptionId, quantite: number): SelectionOptions {
  const suivante: SelectionOptions = { ...selection };
  if (quantite <= 0) {
    delete suivante[id];
    return suivante;
  }
  for (const exclue of trouverOption(id).exclusiveAvec ?? []) delete suivante[exclue];
  suivante[id] = quantite;
  return suivante;
}

/** Retire les options qui ne s'appliquent pas à la formule (après un changement de formule). */
export function nettoyerOptions(formuleId: FormuleId, selection: SelectionOptions): SelectionOptions {
  const suivante: SelectionOptions = {};
  for (const [id, q] of entreesOptions(selection)) {
    if (disponibilite(formuleId, id).disponible) suivante[id] = q;
  }
  return suivante;
}

/** Prix d'une formule pour un gabarit, avec ou sans abonnement. */
export function prixFormule(formuleId: FormuleId, gabarit: Gabarit, abonnement = false): number {
  return abonnement && abonnementPour(formuleId)
    ? prixAbonnement(formuleId, gabarit)
    : trouverFormule(formuleId).prix[gabarit];
}

export function offreLancementDisponible(): boolean {
  return OFFRES.lancement.actif && OFFRES.lancement.placesRestantes > 0;
}

/** Options cochées dans l'ordre de la grille, quantités positives seulement. */
function entreesOptions(selection: SelectionOptions = {}): [OptionId, number][] {
  return OPTIONS.flatMap((o) => {
    const q = selection[o.id];
    return q !== undefined && q > 0 ? [[o.id, q] as [OptionId, number]] : [];
  });
}

const FORMAT_PARRAIN = /^AN-\d{4}-\d{4}$/;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function verifier(entree: EntreeDevis): string | null {
  if (entree.vehicules.length === 0) return "Choisissez au moins une voiture.";
  for (const v of entree.vehicules) {
    const options = entreesOptions(v.options);
    for (const [id, q] of options) {
      const o = trouverOption(id);
      const min = o.unite?.min ?? 1;
      const max = o.unite?.max ?? 1;
      if (!Number.isInteger(q) || q < min || q > max) {
        return o.unite
          ? `${o.libelle} : de ${min} à ${max} ${o.unite.pluriel}.`
          : `${o.libelle} : quantité invalide.`;
      }
      for (const autre of o.exclusiveAvec ?? []) {
        if (options.some(([x]) => x === autre)) {
          return `« ${o.libelle} » et « ${trouverOption(autre).libelle} » ne peuvent pas être cochés ensemble.`;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calcul
// ---------------------------------------------------------------------------

export function calculerDevis(entree: EntreeDevis): ResultatDevis {
  const erreur = verifier(entree);
  if (erreur) return { statut: "invalide", message: erreur };

  const { vehicules, zone } = entree;

  if (zone === "hors-zone") {
    return {
      statut: "sur-demande",
      message: MESSAGE_HORS_ZONE,
      vehiculesMinimum: DEPLACEMENT.horsZone.vehiculesMinimum,
    };
  }

  if (zone === "zone2" && !vehicules.some((v) => DEPLACEMENT.zone2.formulesMinimales.includes(v.formule))) {
    return {
      statut: "refuse",
      motif: "zone2-formule",
      message: MESSAGE_ZONE_2,
      formulesProposees: ["complet", "grand-soin"],
    };
  }

  const lancement = entree.offreLancement ?? offreLancementDisponible();
  const plusieurs = vehicules.length > 1;
  const lignes: LigneDevis[] = [];
  const optionsRefusees: OptionRefusee[] = [];
  const avertissements: Avertissement[] = [];
  const aConfirmer = { min: 0, max: 0 };
  let avecSupplementAConfirmer = false;
  let exterieur = false;
  let desodorisationFacturee = false;
  let siegesEnfant = 0;
  let desodorisationPossibleSansOffre = false;

  for (const [i, v] of vehicules.entries()) {
    const f = trouverFormule(v.formule);
    const g = GABARITS.find((x) => x.code === v.gabarit)!;
    const suffixe = plusieurs ? ` · voiture ${i + 1}` : "";
    const abonnement = v.abonnement ? abonnementPour(f.id) : undefined;

    if (v.abonnement && !abonnement) {
      avertissements.push({
        code: "abonnement-indisponible",
        message: `Pas d'abonnement pour ${f.nom} : prix normal appliqué.`,
      });
    }
    lignes.push({
      type: "formule",
      libelle: abonnement
        ? `${f.nom}, ${g.libelleCourt} (${g.code}) · abonnement ${abonnement.frequence}, −${REMISE_ABONNEMENT_POURCENT} %${suffixe}`
        : `${f.nom}, ${g.libelleCourt} (${g.code})${suffixe}`,
      montant: prixFormule(f.id, v.gabarit, Boolean(abonnement)),
      vehicule: i,
    });
    if (f.avecExterieur) exterieur = true;

    const desodorisationOfferte = lancement && OFFRES.lancement.desodorisationOfferteSur.includes(f.id);
    if (desodorisationOfferte) {
      lignes.push({ type: "offert", libelle: `Désodorisation offerte (offre de lancement)${suffixe}`, montant: 0, vehicule: i });
    } else if (disponibilite(f.id, "desodorisation").disponible) {
      desodorisationPossibleSansOffre = true;
    }

    for (const [id, q] of entreesOptions(v.options)) {
      const o = trouverOption(id);
      const dispo = disponibilite(f.id, id);
      if (!dispo.disponible) {
        optionsRefusees.push({ vehicule: i, option: id, raison: dispo.raison });
        continue;
      }
      if (id === "desodorisation" && desodorisationOfferte) continue;
      if (typeof o.prix !== "number") {
        const { min, max } = o.prix;
        aConfirmer.min += min;
        aConfirmer.max += max;
        avecSupplementAConfirmer = true;
        lignes.push({
          type: "a-confirmer",
          libelle: `${o.libelle}${suffixe}`,
          montant: 0,
          vehicule: i,
          fourchette: { min, max },
        });
        continue;
      }
      if (id === "exterieur-seul") exterieur = true;
      if (id === "desodorisation") desodorisationFacturee = true;
      if (id === "siege-enfant") siegesEnfant += q;
      lignes.push({
        type: "option",
        libelle: o.unite ? `${o.libelle} × ${q}${suffixe}` : `${o.libelle}${suffixe}`,
        montant: o.prix * q,
        vehicule: i,
      });
    }
  }

  const prestations = somme(lignes);

  if (zone === "zone1" && prestations < DEPLACEMENT.zone1.commandeMinimale) {
    return {
      statut: "invalide",
      message: `Commande minimale de ${DEPLACEMENT.zone1.commandeMinimale} € en zone 1.`,
    };
  }

  lignes.push({
    type: "deplacement",
    libelle: zone === "zone1" ? "Déplacement en zone 1 : inclus" : "Déplacement en zone 2",
    montant: zone === "zone1" ? DEPLACEMENT.zone1.supplement : DEPLACEMENT.zone2.supplement,
  });

  // Remises liées au nombre de voitures.
  const pro = OFFRES.professionnels;
  if (entree.professionnel && pro.actif && vehicules.length >= pro.vehiculesMinimum) {
    const remise = prestations - Math.floor((prestations * (100 - pro.remisePourcent)) / 100);
    lignes.push({
      type: "remise",
      libelle: `Professionnels, ${vehicules.length} véhicules : −${pro.remisePourcent} %`,
      montant: -remise,
    });
  } else if (plusieurs && OFFRES.deuxVoitures.actif) {
    lignes.push({ type: "remise", libelle: OFFRES.deuxVoitures.nom, montant: -OFFRES.deuxVoitures.remiseDeuxieme });
  }

  // Code éventuel.
  const code = (entree.code ?? "").trim().toUpperCase();
  if (code) {
    if (code === OFFRES.garage.code && OFFRES.garage.actif) {
      if (desodorisationFacturee) {
        lignes.push({ type: "remise", libelle: "Code GARAGE : désodorisation offerte", montant: -prixOption("desodorisation") });
      } else if (siegesEnfant > 0) {
        lignes.push({ type: "remise", libelle: "Code GARAGE : un siège enfant offert", montant: -prixOption("siege-enfant") });
      } else if (desodorisationPossibleSansOffre) {
        lignes.push({ type: "offert", libelle: "Désodorisation offerte (code GARAGE)", montant: 0 });
      } else {
        lignes.push({ type: "offert", libelle: "Code GARAGE : un siège enfant offert, si vous en avez un", montant: 0 });
      }
      avertissements.push({ code: "garage-creneau", message: "Code GARAGE : créneau proposé sous 7 jours." });
    } else if (code === OFFRES.rueGroupee.code && OFFRES.rueGroupee.actif) {
      lignes.push({ type: "remise", libelle: "Rue groupée (code VOISIN)", montant: -OFFRES.rueGroupee.remiseParClient });
      avertissements.push({
        code: "code-a-verifier",
        message: "Remise rue groupée : votre voisin doit réserver pour le même jour.",
      });
    } else if (FORMAT_PARRAIN.test(code) && OFFRES.parrainage.actif) {
      lignes.push({ type: "remise", libelle: "Parrainage : remise filleul", montant: -OFFRES.parrainage.remiseFilleul });
      avertissements.push({ code: "code-a-verifier", message: "Code parrain vérifié avec votre demande." });
    } else {
      avertissements.push({
        code: "code-inconnu",
        message: `Code « ${code} » non reconnu : nous le vérifierons avec votre demande.`,
      });
    }
  }

  if (exterieur) avertissements.push({ code: "meteo-exterieur", message: MESSAGE_METEO });

  return {
    statut: "estimation",
    total: Math.max(0, somme(lignes)),
    lignes,
    aConfirmer: avecSupplementAConfirmer ? aConfirmer : null,
    optionsRefusees,
    avertissements,
  };
}

function somme(lignes: readonly LigneDevis[]): number {
  return lignes.reduce((total, l) => total + l.montant, 0);
}

function prixOption(id: OptionId): number {
  const p = trouverOption(id).prix;
  return typeof p === "number" ? p : 0;
}
