/**
 * Contexte de déploiement Netlify : production, deploy-preview,
 * branch-deploy ou dev ("" en local).
 *
 * Netlify ne fournit la variable CONTEXT de façon fiable qu'au moment du
 * build : next.config.ts la recopie dans CONTEXTE_DEPLOIEMENT, que Next
 * inscrit dans le code compilé. À utiliser côté serveur (mode
 * démonstration, nom du magasin Netlify Blobs). Les secrets, eux, restent
 * lus à l'exécution avec process.env et ne sont jamais recopiés au build.
 */

/** Contexte du déploiement en cours ("" hors Netlify). */
export function contexteDeploiement(): string {
  // Écrit en toutes lettres (pas de déstructuration) pour que Next le remplace au build.
  return process.env.CONTEXTE_DEPLOIEMENT ?? "";
}

/** Vrai seulement pour le site public, déployé en production sur Netlify. */
export function enProduction(): boolean {
  return contexteDeploiement() === "production";
}
