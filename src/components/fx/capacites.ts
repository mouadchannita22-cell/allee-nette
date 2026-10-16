/**
 * Choix du niveau d'effets visuels selon l'appareil (partie 5.3 du brief).
 *
 * - « complet » : WebGL et animations.
 * - « degrade » : appareil modeste, WebGL indisponible ou connexion lente :
 *   image statique travaillée et animations CSS légères.
 * - « reduit » : l'appareil demande moins de mouvement (prefers-reduced-motion) :
 *   rien ne s'anime, tout reste lisible.
 *
 * Uniquement côté navigateur. Le rendu serveur ne connaît pas l'appareil.
 */

export type ModeEffets = "complet" | "degrade" | "reduit";

type NavigateurEtendu = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/** Seuils du mode dégradé. */
export const SEUILS = {
  /** Mémoire vive annoncée par le navigateur, en Go. */
  memoireMin: 4,
  /** Nombre de cœurs logiques. */
  coeursMin: 4,
} as const;

let webglMemorise: boolean | undefined;

/** Rendu sans carte graphique : le processeur calcule chaque pixel, quelques images par seconde. */
const RENDU_LOGICIEL = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * WebGL 2 accéléré par la carte graphique, avec rendu dans des textures en
 * demi-flottants (nécessaire au pare-brise).
 */
export function webglDisponible(): boolean {
  if (webglMemorise !== undefined) return webglMemorise;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const rendu = gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "";
    webglMemorise =
      !!gl &&
      !RENDU_LOGICIEL.test(rendu) &&
      !!(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglMemorise = false;
  }
  return webglMemorise;
}

/** Connexion lente ou économie de données : on évite aussi de télécharger l'image de repli. */
export function connexionEconome(): boolean {
  const c = (navigator as NavigateurEtendu).connection;
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ""));
}

export function detecterMode(): ModeEffets {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduit";
  const nav = navigator as NavigateurEtendu;
  const lente = connexionEconome() || nav.connection?.effectiveType === "3g";
  const modeste =
    (nav.deviceMemory ?? Infinity) < SEUILS.memoireMin || (nav.hardwareConcurrency ?? Infinity) < SEUILS.coeursMin;
  if (lente || modeste || !webglDisponible()) return "degrade";
  return "complet";
}

/** Écran tactile sans souris : balayage automatique et pinceau plus large. */
export function pointeurGrossier(): boolean {
  return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
}

/**
 * Abonnement aux réglages qui changent le mode (mouvement réduit), pour
 * `useSyncExternalStore`.
 */
export function abonnerMode(rappel: () => void): () => void {
  const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
  requete.addEventListener("change", rappel);
  return () => requete.removeEventListener("change", rappel);
}
