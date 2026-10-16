/**
 * Échange entre le formulaire et la route POST /api/reservation :
 * envoi multipart/form-data avec un champ JSON `donnees` et jusqu'à trois
 * photos (`photo-avant`, `photo-arriere`, `photo-exterieur`).
 */
import { PHOTOS_DEMANDEES, type PhotoId } from "@/data/reservation";
import type { AntiSpam } from "./anti-spam";
import { extensionImage } from "./photos";
import type { DonneesFormulaire, ErreursChamps } from "./formulaire";

export const URL_API_RESERVATION = "/api/reservation";

/** Nom du champ JSON de l'envoi. */
export const CHAMP_DONNEES = "donnees";

/** Contenu du champ JSON `donnees`. Aucun total : le serveur le recalcule. */
export type EnvoiReservation = DonneesFormulaire & { antiSpam: AntiSpam };

/** Réponse de la route. */
export type ReponseReservation =
  | { ok: true; reference: string; demo?: boolean }
  | { ok: false; message: string; champs?: ErreursChamps };

/** Corps de l'envoi : données en JSON, photos compressées en fichiers. */
export function corpsEnvoi(
  donnees: DonneesFormulaire,
  antiSpam: AntiSpam,
  photos: Partial<Record<PhotoId, Blob>> = {},
): FormData {
  const corps = new FormData();
  const envoi: EnvoiReservation = { ...donnees, antiSpam };
  corps.append(CHAMP_DONNEES, JSON.stringify(envoi));
  for (const p of PHOTOS_DEMANDEES) {
    const photo = photos[p.id];
    if (photo) corps.append(p.champ, photo, `${p.champ}.${extensionImage(photo.type) ?? "jpg"}`);
  }
  return corps;
}

const MESSAGE_ILLISIBLE = "La réponse du serveur est illisible. Réessayez dans un instant.";

/** Lit la réponse de la route, sans faire confiance à sa forme. */
export function lireReponse(json: unknown): ReponseReservation {
  if (typeof json !== "object" || json === null) return { ok: false, message: MESSAGE_ILLISIBLE };
  const r = json as Record<string, unknown>;
  if (r.ok === true && typeof r.reference === "string") {
    return { ok: true, reference: r.reference, ...(r.demo === true ? { demo: true } : {}) };
  }
  const message = typeof r.message === "string" && r.message ? r.message : MESSAGE_ILLISIBLE;
  const champs =
    typeof r.champs === "object" && r.champs !== null
      ? Object.fromEntries(Object.entries(r.champs).filter((e): e is [string, string] => typeof e[1] === "string"))
      : undefined;
  return { ok: false, message, ...(champs ? { champs } : {}) };
}
