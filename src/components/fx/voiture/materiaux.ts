import * as THREE from "three";

/** Peinture, vitrage et optiques : reflets nets sur un vernis épais. */
export function creerMateriaux() {
  return {
    peinture: new THREE.MeshPhysicalMaterial({
      color: "#3f7fae",
      metalness: 0.45,
      roughness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
    }),
    vitrage: new THREE.MeshPhysicalMaterial({
      color: "#05080d",
      metalness: 0.9,
      roughness: 0.06,
      envMapIntensity: 1.4,
    }),
    pneu: new THREE.MeshStandardMaterial({ color: "#0c0e12", roughness: 0.82, metalness: 0 }),
    jante: new THREE.MeshStandardMaterial({ color: "#d7e1ea", roughness: 0.3, metalness: 0.85, envMapIntensity: 1.8 }),
    garniture: new THREE.MeshStandardMaterial({ color: "#0b0f15", roughness: 0.55, metalness: 0.1 }),
    phares: new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#e9fbff", emissiveIntensity: 2.4 }),
    feux: new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#ff3b4e", emissiveIntensity: 1.4 }),
  };
}

/** Dégradé radial dessiné une fois dans un petit canvas (ombre, flaque de lumière). */
function degradeRadial(arrets: [number, string][]) {
  const taille = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = taille;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
    for (const [position, couleur] of arrets) g.addColorStop(position, couleur);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, taille, taille);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Ombre de contact sous la voiture, sans calcul d'ombre. */
export function creerOmbre() {
  const map = degradeRadial([
    [0, "rgba(0,0,0,0.85)"],
    [0.55, "rgba(0,0,0,0.45)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
}

/** Flaque de lumière des phares sur le sol, en mélange additif. */
export function creerFlaque() {
  const map = degradeRadial([
    [0, "rgba(220,250,255,0.32)"],
    [0.4, "rgba(120,230,225,0.1)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
