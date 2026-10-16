import * as THREE from "three";

/**
 * Éclairage de studio : des bandes lumineuses rendues une seule fois dans une
 * carte d'environnement (PMREM). Ce sont elles qui dessinent les reflets sur
 * le vernis. Aucune image HDR à télécharger.
 */
type Bande = {
  couleur: string;
  intensite: number;
  position: [number, number, number];
  echelle: [number, number];
  forme?: "rectangle" | "anneau";
};

const BANDES: Bande[] = [
  { couleur: "#ffffff", intensite: 6, position: [0, 6, 0], echelle: [12, 2] },
  { couleur: "#2ee6d6", intensite: 4, position: [-7, 1.4, 1], echelle: [9, 0.9] },
  { couleur: "#bfe9ff", intensite: 3, position: [7, 2.2, -1], echelle: [7, 1.5] },
  { couleur: "#ffffff", intensite: 4, position: [4, 4, 7], echelle: [2.4, 2.4], forme: "anneau" },
  { couleur: "#19c3b1", intensite: 2, position: [0, 1, -8], echelle: [14, 2.5] },
];

export function creerEnvironnement(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color("#03060b");
  const rectangle = new THREE.PlaneGeometry(1, 1);
  const anneau = new THREE.RingGeometry(0.5, 1, 48);
  const materiaux: THREE.Material[] = [];

  for (const b of BANDES) {
    const materiau = new THREE.MeshBasicMaterial({
      color: new THREE.Color(b.couleur).multiplyScalar(b.intensite),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    materiaux.push(materiau);
    const mesh = new THREE.Mesh(b.forme === "anneau" ? anneau : rectangle, materiau);
    mesh.position.set(...b.position);
    mesh.scale.set(b.echelle[0], b.echelle[1], 1);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const carte = pmrem.fromScene(studio, 0.02);
  pmrem.dispose();
  rectangle.dispose();
  anneau.dispose();
  materiaux.forEach((m) => m.dispose());
  return carte;
}
