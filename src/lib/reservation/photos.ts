/**
 * Photos jointes à une demande, contrôlées par le serveur. Fonctions pures.
 *
 * Le navigateur les compresse avant l'envoi (moins de 500 Ko, JPEG). Le
 * serveur accepte un peu plus large, mais reste sous la limite d'une
 * fonction Netlify (environ 4,5 Mo de binaire par requête) : 3 photos au
 * plus, 1 Mo chacune et 3 Mo au total, en JPEG, PNG ou WebP, vérifiés aussi
 * par la signature des premiers octets.
 */
import { PHOTOS_DEMANDEES } from "@/data/reservation";

const MO = 1024 * 1024;

export const LIMITES_PHOTOS = { nombreMax: PHOTOS_DEMANDEES.length, octetsMax: MO, totalMax: 3 * MO } as const;

/** Taille maximale d'une requête : les photos, plus les données et l'enveloppe multipart. */
export const TAILLE_MAX_REQUETE = LIMITES_PHOTOS.totalMax + 200 * 1024;

export type TypeImage = "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<TypeImage, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Extension de fichier d'un type d'image accepté (« jpg »), sinon `null`. */
export function extensionImage(type: string): string | null {
  return EXTENSIONS[type as TypeImage] ?? null;
}

function commencePar(octets: Uint8Array, signature: readonly number[], decalage = 0): boolean {
  return signature.every((o, i) => octets[decalage + i] === o);
}

/** Type réel d'une image d'après ses premiers octets, ou `null` si ce n'est ni du JPEG, ni du PNG, ni du WebP. */
export function typeSelonSignature(octets: Uint8Array): TypeImage | null {
  if (commencePar(octets, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (commencePar(octets, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // « RIFF », taille sur 4 octets, puis « WEBP ».
  if (commencePar(octets, [0x52, 0x49, 0x46, 0x46]) && commencePar(octets, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

/** Fichier lu dans l'envoi multipart. */
export type FichierRecu = { champ: string; type: string; contenu: Uint8Array };

/** Photo acceptée, prête à joindre à l'e-mail. */
export type PhotoVerifiee = {
  champ: string;
  libelle: string;
  nomFichier: string;
  type: TypeImage;
  octets: number;
  contenu: Uint8Array;
};

export type VerificationPhotos =
  | { ok: true; photos: PhotoVerifiee[] }
  | { ok: false; statut: 413 | 422; message: string; champ?: string };

const PROPOSER_WHATSAPP = "ou envoyez-la-nous sur WhatsApp";

/** Contrôle les photos reçues, dans l'ordre des photos demandées. */
export function verifierPhotos(fichiers: readonly FichierRecu[]): VerificationPhotos {
  const recus = fichiers.filter((f) => f.contenu.byteLength > 0);
  if (recus.length > LIMITES_PHOTOS.nombreMax) {
    return { ok: false, statut: 422, message: `${LIMITES_PHOTOS.nombreMax} photos au plus.` };
  }
  const photos: PhotoVerifiee[] = [];
  let total = 0;
  for (const f of recus) {
    const demandee = PHOTOS_DEMANDEES.find((p) => p.champ === f.champ);
    if (!demandee || photos.some((p) => p.champ === f.champ)) {
      return { ok: false, statut: 422, message: "Fichier inattendu dans la demande.", champ: f.champ };
    }
    const libelle = demandee.libelle;
    if (f.contenu.byteLength > LIMITES_PHOTOS.octetsMax) {
      return {
        ok: false,
        statut: 413,
        message: `La photo « ${libelle} » dépasse 1 Mo : choisissez-en une autre, ${PROPOSER_WHATSAPP}.`,
        champ: f.champ,
      };
    }
    const type = typeSelonSignature(f.contenu);
    if (!type || type !== f.type.toLowerCase()) {
      return {
        ok: false,
        statut: 422,
        message: `La photo « ${libelle} » n'est pas une image JPEG, PNG ou WebP : choisissez-en une autre, ${PROPOSER_WHATSAPP}.`,
        champ: f.champ,
      };
    }
    total += f.contenu.byteLength;
    photos.push({
      champ: f.champ,
      libelle,
      nomFichier: `${f.champ}.${EXTENSIONS[type]}`,
      type,
      octets: f.contenu.byteLength,
      contenu: f.contenu,
    });
  }
  if (total > LIMITES_PHOTOS.totalMax) {
    return {
      ok: false,
      statut: 413,
      message: "Vos photos dépassent 3 Mo au total : retirez-en une, ou envoyez-les-nous sur WhatsApp.",
    };
  }
  photos.sort(
    (a, b) =>
      PHOTOS_DEMANDEES.findIndex((p) => p.champ === a.champ) - PHOTOS_DEMANDEES.findIndex((p) => p.champ === b.champ),
  );
  return { ok: true, photos };
}
