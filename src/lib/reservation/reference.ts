/**
 * Référence unique des demandes : AN-AAAA-NNNN (par exemple AN-2026-0142),
 * année à l'heure de Paris.
 *
 * Le numéro vient d'un compteur annuel stocké dans Netlify Blobs : un seul
 * nombre par année, aucune donnée personnelle. Netlify déconseille les
 * compteurs sur Blobs (pas d'incrément atomique) ; le volume ici est très
 * faible, quelques demandes par jour, et l'écriture conditionnelle (etag)
 * suffit : en cas d'écritures simultanées, l'une échoue et recommence.
 *
 * - Le magasin est propre au contexte (`references` en production,
 *   `references-apercu` ailleurs) : un magasin de site est partagé par tous
 *   les déploiements, aperçus compris.
 * - Hors Netlify (local, tests) : compteur en mémoire.
 * - Si Blobs ne répond pas : référence de secours au même format, dérivée de
 *   l'horodatage (numéros 9000 à 9999), signalée dans l'e-mail aux associés.
 */
import { getStore } from "@netlify/blobs";
import { anneeParis } from "@/lib/date-paris";
import { contexteDeploiement, enProduction } from "@/lib/environnement";

export const FORMAT_REFERENCE = /^AN-\d{4}-\d{4}$/;

/** AN-2026-0042. Numéro de 1 à 9999. */
export function formaterReference(annee: number, numero: number): string {
  if (!Number.isInteger(annee) || annee < 1000 || annee > 9999) throw new RangeError(`Année invalide : ${annee}`);
  if (!Number.isInteger(numero) || numero < 1 || numero > 9999) throw new RangeError(`Numéro invalide : ${numero}`);
  return `AN-${annee}-${String(numero).padStart(4, "0")}`;
}

/** Référence de secours, dérivée de l'horodatage : AN-AAAA-9xxx. */
export function referenceSecours(maintenant: Date): string {
  return formaterReference(anneeParis(maintenant), 9000 + (Math.floor(maintenant.getTime() / 1000) % 1000));
}

/** Nom du magasin Netlify Blobs du compteur, selon le contexte de déploiement. */
export function nomMagasinReferences(contexte: string): string {
  return contexte === "production" ? "references" : "references-apercu";
}

// ---------------------------------------------------------------------------
// Compteur
// ---------------------------------------------------------------------------

/** Ce dont le compteur a besoin dans un magasin Netlify Blobs (remplaçable dans les tests). */
export type MagasinCompteur = {
  getWithMetadata(cle: string, options: { type: "json" }): Promise<{ data: unknown; etag?: string } | null>;
  setJSON(
    cle: string,
    valeur: unknown,
    options: { onlyIfNew: true } | { onlyIfMatch: string },
  ): Promise<{ modified: boolean; etag?: string }>;
};

/** Tentatives d'écriture conditionnelle. Le client Blobs réessaie déjà lui-même les erreurs réseau. */
const TENTATIVES = 5;

const pause = (ms: number) => new Promise((fin) => setTimeout(fin, ms));

/** Incrémente le compteur de l'année et renvoie le nouveau numéro (1 pour la première demande). */
export async function incrementerCompteur(magasin: MagasinCompteur, annee: number, tentatives = TENTATIVES): Promise<number> {
  const cle = String(annee);
  for (let i = 0; i < tentatives; i++) {
    const actuel = await magasin.getWithMetadata(cle, { type: "json" });
    let suivant: number;
    let ecriture: { modified: boolean; etag?: string };
    if (actuel === null) {
      suivant = 1;
      ecriture = await magasin.setJSON(cle, suivant, { onlyIfNew: true });
    } else {
      const valeur = actuel.data;
      if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur < 0 || !actuel.etag) {
        throw new Error("Compteur de références illisible");
      }
      suivant = valeur + 1;
      ecriture = await magasin.setJSON(cle, suivant, { onlyIfMatch: actuel.etag });
    }
    // Le client Blobs compte une erreur serveur finale comme « modifié » sans etag :
    // seule une écriture avec etag est une réussite certaine.
    if (ecriture.modified && ecriture.etag) return suivant;
    await pause(20 + Math.random() * 80);
  }
  throw new Error("Compteur de références occupé");
}

const compteursMemoire = new Map<number, number>();

/** Compteur en mémoire, hors Netlify : il repart de 1 à chaque démarrage du serveur. */
export function incrementerEnMemoire(annee: number): number {
  const numero = (compteursMemoire.get(annee) ?? 0) + 1;
  compteursMemoire.set(annee, numero);
  return numero;
}

function horsNetlify(erreur: unknown): boolean {
  return erreur instanceof Error && erreur.name === "MissingBlobsEnvironmentError";
}

function ouvrirMagasin(): MagasinCompteur {
  // Lève MissingBlobsEnvironmentError hors Netlify.
  return getStore({ name: nomMagasinReferences(contexteDeploiement()), consistency: "strong" });
}

export type Reference = { reference: string; secours: boolean };

/** Nouvelle référence de demande. Ne lève jamais d'erreur. */
export async function obtenirReference(maintenant = new Date(), magasin?: () => MagasinCompteur): Promise<Reference> {
  const annee = anneeParis(maintenant);
  try {
    const numero = await incrementerCompteur((magasin ?? ouvrirMagasin)(), annee);
    return { reference: formaterReference(annee, numero), secours: false };
  } catch (erreur) {
    if (horsNetlify(erreur) && !enProduction()) {
      try {
        return { reference: formaterReference(annee, incrementerEnMemoire(annee)), secours: false };
      } catch {
        // Plus de 9999 demandes depuis le démarrage : référence de secours.
      }
    } else {
      // Aucune donnée personnelle dans ce journal.
      console.error(`[réservation] Compteur de références indisponible (${erreur instanceof Error ? erreur.name : "erreur"})`);
    }
    return { reference: referenceSecours(maintenant), secours: true };
  }
}
