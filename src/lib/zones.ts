import { zoneActive, type Commune, type PrereglageZone } from "@/config/site";
import type { ZoneTarif } from "@/data/offres";
import { normaliser } from "./texte";

export type CommuneZonee = Commune & { zone: Exclude<ZoneTarif, "hors-zone"> };

function communesZonees(prereglage: PrereglageZone): CommuneZonee[] {
  return [
    ...prereglage.zone1.map((c) => ({ ...c, zone: "zone1" as const })),
    ...prereglage.zone2.map((c) => ({ ...c, zone: "zone2" as const })),
  ];
}

/** Retrouve une commune desservie par son nom exact (accents et casse ignorés). */
export function trouverCommune(saisie: string, prereglage: PrereglageZone = zoneActive): CommuneZonee | null {
  const cible = normaliser(saisie);
  if (!cible) return null;
  return communesZonees(prereglage).find((c) => normaliser(c.nom) === cible) ?? null;
}

/** Zone tarifaire d'une commune : zone 1, zone 2, ou hors zone si elle n'est pas desservie. */
export function zoneDeCommune(saisie: string, prereglage: PrereglageZone = zoneActive): ZoneTarif {
  return trouverCommune(saisie, prereglage)?.zone ?? "hors-zone";
}

/**
 * Suggestions pour le champ « Votre commune » : par nom (début puis milieu)
 * ou par code postal. Seules les communes desservies sont proposées.
 */
export function rechercherCommunes(
  saisie: string,
  limite = 8,
  prereglage: PrereglageZone = zoneActive,
): CommuneZonee[] {
  const cible = normaliser(saisie);
  if (!cible) return [];
  const toutes = communesZonees(prereglage);
  if (/^\d+$/.test(cible)) {
    return toutes.filter((c) => c.cp.startsWith(cible)).slice(0, limite);
  }
  const debut: CommuneZonee[] = [];
  const milieu: CommuneZonee[] = [];
  for (const c of toutes) {
    const nom = normaliser(c.nom);
    if (nom.startsWith(cible)) debut.push(c);
    else if (nom.includes(cible)) milieu.push(c);
  }
  // Le nom le plus court d'abord : « pon » propose Pons avant Pont-l'Abbé-d'Arnoult.
  debut.sort((a, b) => a.nom.length - b.nom.length || a.nom.localeCompare(b.nom, "fr"));
  return [...debut, ...milieu].slice(0, limite);
}
