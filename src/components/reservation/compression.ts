/**
 * Compression des photos dans le navigateur, avant l'envoi (partie 9.1 du
 * brief) : environ 1 600 px sur le côté le plus long, moins de 500 Ko, en
 * JPEG. L'image est redessinée dans un canvas puis réencodée : les
 * métadonnées EXIF, dont la position GPS, disparaissent.
 *
 * La bibliothèque est chargée à la demande, au premier choix de photo :
 * elle ne pèse rien dans le JavaScript initial. Elle tourne sur le fil
 * principal (`useWebWorker: false`) : son web worker irait sinon chercher
 * une copie d'elle-même sur un CDN, ce que le site s'interdit.
 */
import { COMPRESSION_PHOTOS } from "@/data/reservation";

export type ResultatCompression = { ok: true; photo: File } | { ok: false; message: string };

/** Second essai, plus serré, si le premier dépasse encore la limite. */
const SECOND_ESSAI = { coteMaxPx: 1200, qualite: 0.7 } as const;

export const MESSAGES_PHOTO = {
  pasUneImage: "Ce fichier n'est pas une photo. Choisissez une image JPEG, PNG ou WebP.",
  illisible:
    "Cette photo ne peut pas être lue par votre navigateur (format HEIC, ou fichier abîmé). Choisissez-en une autre, ou envoyez-la-nous sur WhatsApp.",
  tropLourde: "Cette photo reste trop lourde, même allégée. Choisissez-en une autre, ou envoyez-la-nous sur WhatsApp.",
} as const;

/** Compresse une photo choisie par le client. Ne lève jamais d'erreur. */
export async function compresserPhoto(source: File): Promise<ResultatCompression> {
  if (!source.type.startsWith("image/")) return { ok: false, message: MESSAGES_PHOTO.pasUneImage };
  try {
    const { default: imageCompression } = await import("browser-image-compression");
    const essai = (fichier: File, coteMaxPx: number, qualite: number, cibleMo: number) =>
      imageCompression(fichier, {
        maxSizeMB: cibleMo,
        maxWidthOrHeight: coteMaxPx,
        initialQuality: qualite,
        fileType: COMPRESSION_PHOTOS.type,
        preserveExif: false,
        useWebWorker: false,
      });

    let photo = await essai(source, COMPRESSION_PHOTOS.coteMaxPx, COMPRESSION_PHOTOS.qualiteInitiale, COMPRESSION_PHOTOS.cibleMo);
    if (photo.size > COMPRESSION_PHOTOS.poidsMaxOctets) {
      photo = await essai(photo, SECOND_ESSAI.coteMaxPx, SECOND_ESSAI.qualite, COMPRESSION_PHOTOS.cibleMo * 0.8);
    }
    if (photo.size > COMPRESSION_PHOTOS.poidsMaxOctets) return { ok: false, message: MESSAGES_PHOTO.tropLourde };
    if (photo.type !== COMPRESSION_PHOTOS.type) return { ok: false, message: MESSAGES_PHOTO.illisible };
    return { ok: true, photo };
  } catch {
    // Image indécodable : la bibliothèque rejette avec un évènement, pas une erreur.
    return { ok: false, message: MESSAGES_PHOTO.illisible };
  }
}
