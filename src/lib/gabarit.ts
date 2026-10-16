import { MODELES, type CorrespondanceModele } from "@/data/gabarits-modeles";
import { contientMot, normaliser } from "./texte";

/**
 * Propose un gabarit à partir du modèle saisi (« Peugeot 3008 » → M).
 * Le mot-clé le plus long l'emporte : « Yaris Cross » (M) avant « Yaris » (S).
 * Renvoie `null` si aucun modèle connu n'est reconnu.
 */
export function devinerGabarit(saisie: string): CorrespondanceModele | null {
  const texte = normaliser(saisie);
  if (texte.length < 2) return null;
  let meilleur: CorrespondanceModele | null = null;
  let longueur = 0;
  for (const m of MODELES) {
    for (const motCle of m.motsCles) {
      if (motCle.length > longueur && contientMot(texte, motCle)) {
        meilleur = m;
        longueur = motCle.length;
      }
    }
  }
  return meilleur;
}
