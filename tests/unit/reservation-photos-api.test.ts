import { describe, expect, it } from "vitest";
import { CHAMP_DONNEES, corpsEnvoi, lireReponse } from "@/lib/reservation/api";
import { LIMITES_PHOTOS, typeSelonSignature, verifierPhotos, type FichierRecu } from "@/lib/reservation/photos";
import { formulaireInitial } from "@/lib/reservation/schema";

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

/** Fichier de `taille` octets commençant par `entete`. */
function fichier(champ: string, type: string, entete: readonly number[], taille = 2_000): FichierRecu {
  const contenu = new Uint8Array(taille);
  contenu.set(entete);
  return { champ, type, contenu };
}

describe("photos : signature des premiers octets", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg"],
    ["PNG", PNG, "image/png"],
    ["WebP", WEBP, "image/webp"],
    ["GIF", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], null],
    ["texte", [0x3c, 0x68, 0x74, 0x6d, 0x6c], null],
    ["vide", [], null],
  ] as const)("%s → %s", (_nom, entete, attendu) => {
    expect(typeSelonSignature(Uint8Array.from(entete))).toBe(attendu);
  });
});

describe("photos : contrôle côté serveur", () => {
  it("trois photos acceptées, dans l'ordre demandé, nommées d'après leur type réel", () => {
    const r = verifierPhotos([
      fichier("photo-exterieur", "image/webp", WEBP),
      fichier("photo-avant", "image/jpeg", JPEG),
      fichier("photo-arriere", "image/png", PNG),
    ]);
    expect(r.ok && r.photos.map((p) => [p.libelle, p.nomFichier, p.octets])).toEqual([
      ["Habitacle avant", "photo-avant.jpg", 2_000],
      ["Habitacle arrière", "photo-arriere.png", 2_000],
      ["Extérieur", "photo-exterieur.webp", 2_000],
    ]);
  });

  it("aucune photo : accepté (elles sont facultatives) ; fichier vide ignoré", () => {
    expect(verifierPhotos([])).toEqual({ ok: true, photos: [] });
    expect(verifierPhotos([{ champ: "photo-avant", type: "", contenu: new Uint8Array() }])).toEqual({ ok: true, photos: [] });
  });

  it("plus de 1 Mo : 413", () => {
    const r = verifierPhotos([fichier("photo-avant", "image/jpeg", JPEG, LIMITES_PHOTOS.octetsMax + 1)]);
    expect(r).toMatchObject({ ok: false, statut: 413, champ: "photo-avant" });
    expect(!r.ok && r.message).toContain("« Habitacle avant » dépasse 1 Mo");
    expect(verifierPhotos([fichier("photo-avant", "image/jpeg", JPEG, LIMITES_PHOTOS.octetsMax)]).ok).toBe(true);
  });

  it("pas une image, ou type annoncé différent du contenu : 422", () => {
    expect(verifierPhotos([fichier("photo-avant", "image/jpeg", [0x25, 0x50, 0x44, 0x46])])).toMatchObject({
      ok: false,
      statut: 422,
    });
    expect(verifierPhotos([fichier("photo-avant", "image/png", JPEG)])).toMatchObject({ ok: false, statut: 422 });
    expect(verifierPhotos([fichier("photo-avant", "image/gif", [0x47, 0x49, 0x46, 0x38])])).toMatchObject({
      ok: false,
      statut: 422,
    });
  });

  it("champ inconnu, doublon ou plus de 3 photos : 422", () => {
    expect(verifierPhotos([fichier("photo-moteur", "image/jpeg", JPEG)])).toMatchObject({ ok: false, statut: 422 });
    expect(
      verifierPhotos([fichier("photo-avant", "image/jpeg", JPEG), fichier("photo-avant", "image/jpeg", JPEG)]),
    ).toMatchObject({ ok: false, statut: 422 });
    expect(
      verifierPhotos([
        fichier("photo-avant", "image/jpeg", JPEG),
        fichier("photo-arriere", "image/jpeg", JPEG),
        fichier("photo-exterieur", "image/jpeg", JPEG),
        fichier("photo-autre", "image/jpeg", JPEG),
      ]),
    ).toEqual({ ok: false, statut: 422, message: "3 photos au plus." });
  });
});

describe("échange avec la route", () => {
  it("corps multipart : données JSON avec l'anti-spam, photos nommées", async () => {
    const donnees = formulaireInitial();
    const corps = corpsEnvoi(donnees, { piege: "", ouvertLe: 1, envoyeLe: 9_001 }, {
      avant: new Blob([Uint8Array.from(JPEG)], { type: "image/jpeg" }),
    });
    const json = JSON.parse(corps.get(CHAMP_DONNEES) as string);
    expect(json.antiSpam).toEqual({ piege: "", ouvertLe: 1, envoyeLe: 9_001 });
    expect(json.voitures).toEqual(donnees.voitures);
    expect(json).not.toHaveProperty("total");
    const photo = corps.get("photo-avant") as File;
    expect(photo.name).toBe("photo-avant.jpg");
    expect(photo.type).toBe("image/jpeg");
    expect(corps.has("photo-arriere")).toBe(false);
  });

  it("lecture prudente de la réponse", () => {
    expect(lireReponse({ ok: true, reference: "AN-2026-0001", demo: true })).toEqual({
      ok: true,
      reference: "AN-2026-0001",
      demo: true,
    });
    expect(lireReponse({ ok: true, reference: "AN-2026-0001" })).toEqual({ ok: true, reference: "AN-2026-0001" });
    expect(lireReponse({ ok: false, message: "À corriger.", champs: { "lieu.commune": "Commune ?", x: 3 } })).toEqual({
      ok: false,
      message: "À corriger.",
      champs: { "lieu.commune": "Commune ?" },
    });
    expect(lireReponse("<html>")).toMatchObject({ ok: false });
    expect(lireReponse({ ok: true })).toMatchObject({ ok: false });
    // La référence sert d'adresse à la page de remerciement : seul le format AN-AAAA-NNNN passe.
    expect(lireReponse({ ok: true, reference: "AN-2026-1/../x" })).toMatchObject({ ok: false });
    expect(lireReponse({ ok: true, reference: "<b>AN-2026-0001</b>" })).toMatchObject({ ok: false });
  });
});
