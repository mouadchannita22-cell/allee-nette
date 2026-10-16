/**
 * Créneaux de la réservation : vraies dates calculées à partir des créneaux
 * configurés (data/reservation.ts), à l'heure de Paris. Fonctions pures,
 * utilisées par le navigateur (liste proposée) et par le serveur (contrôle).
 */
import { CRENEAUX_PROPOSES, MOMENTS, REGLES_CRENEAUX, type Moment } from "@/data/reservation";
import { capitaliser, depuisIso, formaterJour, jourParis, jourSemaine, versIso } from "@/lib/date-paris";

export type Creneau = {
  /** Identifiant envoyé au serveur : « 2026-10-21_apres-midi ». */
  id: string;
  date: string;
  moment: Moment;
  /** « Mercredi 21 octobre, après-midi ». */
  libelle: string;
};

const FORMAT_CRENEAU = /^(\d{4}-\d{2}-\d{2})_(matin|apres-midi)$/;

/** Identifiant d'un créneau. */
export function idCreneau(date: string, moment: Moment): string {
  return `${date}_${moment}`;
}

/** Lit un identifiant de créneau ; `null` s'il est mal formé ou si la date n'existe pas. */
export function lireCreneau(id: string): { date: string; jour: number; moment: Moment } | null {
  const m = FORMAT_CRENEAU.exec(id);
  if (!m) return null;
  const jour = depuisIso(m[1]!);
  return jour === null ? null : { date: m[1]!, jour, moment: m[2] as Moment };
}

/** « Mercredi 21 octobre, après-midi », ou "" si l'identifiant est invalide. */
export function libelleCreneau(id: string): string {
  const c = lireCreneau(id);
  return c ? capitaliser(`${formaterJour(c.jour)}, ${MOMENTS[c.moment]}`) : "";
}

/**
 * Créneaux proposés, du lendemain jusqu'à l'horizon (4 semaines), dans
 * l'ordre chronologique. `toleranceJours` élargit la fenêtre des deux côtés :
 * le serveur accepte un jour d'écart (formulaire ouvert la veille au soir,
 * horloge du téléphone décalée).
 */
export function creneauxDisponibles(maintenant: Date, { toleranceJours = 0 } = {}): Creneau[] {
  const aujourdhui = jourParis(maintenant);
  const debut = aujourdhui + REGLES_CRENEAUX.delaiMinimumJours - toleranceJours;
  const fin = aujourdhui + REGLES_CRENEAUX.horizonSemaines * 7 + toleranceJours;
  const liste: Creneau[] = [];
  for (let jour = debut; jour <= fin; jour++) {
    const date = versIso(jour);
    for (const c of CRENEAUX_PROPOSES) {
      if (c.jour !== jourSemaine(jour)) continue;
      const id = idCreneau(date, c.moment);
      liste.push({ id, date, moment: c.moment, libelle: libelleCreneau(id) });
    }
  }
  return liste;
}

/** Le créneau fait-il partie des créneaux proposés à cette date (avec la tolérance) ? */
export function creneauAutorise(id: string, maintenant: Date, toleranceJours = 0): boolean {
  return creneauxDisponibles(maintenant, { toleranceJours }).some((c) => c.id === id);
}
