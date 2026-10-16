"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { creerEnvironnement } from "../voiture/eclairage";
import { VoitureGenerique } from "../voiture/VoitureGenerique";
import { composition, generationVitre, masque, sommetPleinEcran } from "./shaders";

/** Position du pointeur, partagée avec le composant qui écoute la page. */
export type EtatPinceau = {
  /** Coordonnées normalisées dans le héros : 0 à 1, y vers le haut. */
  x: number;
  y: number;
  /** Horodatage (performance.now) du dernier mouvement, -1 si aucun. */
  t: number;
  /** Nouveau tracé : ne pas relier au point précédent. */
  nouveau: boolean;
};

export type PropsScene = {
  /** Faux : rendu en pause (héros hors écran ou onglet caché). */
  actif: boolean;
  pinceauRef: RefObject<EtatPinceau>;
  /** Écran tactile : balayage automatique toutes les 6 secondes, pinceau plus large. */
  tactile: boolean;
  /** Rendu déterministe pour fabriquer l'image de repli (scripts/generer-affiche-heros.ts). */
  affiche?: boolean;
  /** Appelé après la première image : le canvas peut apparaître. */
  onPret: () => void;
};

const REGLAGES = {
  /** Temps pour que la vitre redevienne entièrement sale, en secondes. */
  resalissement: 120,
  /** Passage de microfibre au chargement. */
  microfibre: { debut: 0.45, duree: 1.6, rayon: 0.17 },
  /** Balayage automatique sur écran tactile. */
  balayage: { periode: 6, duree: 1.3, premier: 3.5 },
  rayonPinceau: { souris: 0.075, doigt: 0.1 },
  tailleMasque: 384,
  tailleVitre: [2048, 1024] as const,
};

const NUIT = new THREE.Color("#0b1220");

function plage(x: number) {
  return Math.min(1, Math.max(0, x));
}

function adoucir(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Cadrage : voiture à droite du texte sur ordinateur, au-dessus sur mobile. */
function cadrer(camera: THREE.PerspectiveCamera, aspect: number) {
  if (aspect >= 1) {
    camera.fov = 26;
    camera.position.set(0, 1.7, 15.5);
    camera.lookAt(-2.6 * Math.min(aspect / 1.6, 1.35), 0.55, 0);
  } else {
    // Mobile : le texte occupe presque tout l'écran ; la voiture passe au loin, en haut.
    camera.fov = 30;
    camera.position.set(0, 2.6, 30);
    camera.lookAt(-0.2, -5.2, 0);
  }
  camera.updateProjectionMatrix();
}

/** Point du chemin de la microfibre (diagonale de bas à gauche vers haut à droite). */
function cheminMicrofibre(k: number, aspect: number) {
  return new THREE.Vector2(-0.25 + k * (aspect + 0.5), 0.02 + k * 0.96);
}

/** Point de l'essuie-glace : arc autour d'un pivot sous l'écran. */
function pointBalayage(k: number, aspect: number, rayon: number) {
  const angle = Math.PI * (0.88 - 0.76 * k);
  return new THREE.Vector2(aspect * 0.5 + Math.cos(angle) * rayon, -0.28 + Math.sin(angle) * rayon);
}

function materiau(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: sommetPleinEcran,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

function creerRessources(tactile: boolean) {
  const cible = (largeur: number, hauteur: number, options: THREE.RenderTargetOptions = {}) =>
    new THREE.WebGLRenderTarget(largeur, hauteur, {
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      ...options,
    });

  const masques = [
    cible(REGLAGES.tailleMasque, REGLAGES.tailleMasque),
    cible(REGLAGES.tailleMasque, REGLAGES.tailleMasque),
  ];
  const vitre = cible(...REGLAGES.tailleVitre, { wrapS: THREE.MirroredRepeatWrapping });
  const scene = cible(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: true,
    samples: tactile ? 0 : 4,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });

  const matGeneration = materiau(generationVitre, {});
  const matMasque = materiau(masque, {
    tPrecedent: { value: null },
    uDt: { value: 0 },
    uDureeResalissement: { value: REGLAGES.resalissement },
    uAspect: { value: 1 },
    uGraine: { value: 0 },
    uNbSegments: { value: 0 },
    uSegments: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    uRayons: { value: new Array<number>(6).fill(0) },
  });
  const matComposition = materiau(composition, {
    tScene: { value: scene.texture },
    tMasque: { value: null },
    tVitre: { value: vitre.texture },
    uTemps: { value: 0 },
    uAspect: { value: 1 },
    uApparition: { value: 0 },
    uFondHaut: { value: NUIT.clone().multiplyScalar(0.9) },
    uFondBas: { value: new THREE.Color("#0f2a4a").multiplyScalar(0.55) },
    uLueur: { value: new THREE.Color("#2ee6d6").multiplyScalar(0.05) },
    uCentreLueur: { value: new THREE.Vector2(0.7, 0.55) },
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), matGeneration);
  quad.frustumCulled = false;
  const scenePleinEcran = new THREE.Scene();
  scenePleinEcran.add(quad);
  const cameraPleinEcran = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    masques,
    vitre,
    scene,
    quad,
    scenePleinEcran,
    cameraPleinEcran,
    matGeneration,
    matMasque,
    matComposition,
    /** Carte d'environnement du studio, créée à la première image. */
    environnement: null as THREE.WebGLRenderTarget | null,
    dispose() {
      [...masques, vitre, scene].forEach((c) => c.dispose());
      this.environnement?.dispose();
      [matGeneration, matMasque, matComposition].forEach((m) => m.dispose());
      quad.geometry.dispose();
    },
  };
}

type Ressources = ReturnType<typeof creerRessources>;

function Rendu({ pinceauRef, tactile, affiche, onPret }: Omit<PropsScene, "actif">) {
  const ressources = useRef<Ressources | null>(null);
  const etat = useRef({
    temps: 0,
    images: 0,
    vitrePrete: false,
    courant: 0,
    largeur: 0,
    hauteur: 0,
    precedent: null as THREE.Vector2 | null,
    parallaxe: 0,
  });

  useEffect(() => {
    const r = creerRessources(tactile);
    ressources.current = r;
    etat.current.vitrePrete = false;
    etat.current.largeur = 0;
    return () => {
      ressources.current = null;
      r.dispose();
    };
  }, [tactile]);

  useFrame((state, delta) => {
    const r = ressources.current;
    if (!r) return;
    const { gl, scene, size, viewport } = state;
    const camera = state.camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const e = etat.current;

    // Taille du rendu et cadrage, recalculés quand le héros change de taille.
    const largeur = Math.round(size.width * viewport.dpr);
    const hauteur = Math.round(size.height * viewport.dpr);
    if (largeur !== e.largeur || hauteur !== e.hauteur) {
      e.largeur = largeur;
      e.hauteur = hauteur;
      r.scene.setSize(largeur, hauteur);
      cadrer(camera, aspect);
      r.matComposition.uniforms.uCentreLueur!.value.set(aspect >= 1 ? 0.7 : 0.55, aspect >= 1 ? 0.5 : 0.72);
    }

    // En mode affiche, le temps avance par pas fixes : image reproductible, même sur un rendu logiciel lent.
    const dt = affiche ? 1 / 12 : Math.min(delta, 1 / 20);
    e.temps += dt;
    e.images += 1;

    // 1. Vitre (saleté et perles), une seule fois.
    if (!e.vitrePrete) {
      r.environnement ??= creerEnvironnement(gl);
      scene.environment = r.environnement.texture;
      r.quad.material = r.matGeneration;
      gl.setRenderTarget(r.vitre);
      gl.render(r.scenePleinEcran, r.cameraPleinEcran);
      for (const m of r.masques) {
        gl.setRenderTarget(m);
        gl.setClearColor(0x000000, 0);
        gl.clear();
      }
      e.vitrePrete = true;
    }

    // 2. Ce qui est essuyé pendant cette image : microfibre, pointeur, essuie-glace.
    const segments: [THREE.Vector2, THREE.Vector2, number][] = [];
    const { microfibre: mf, balayage: bl } = REGLAGES;
    const k0 = plage((e.temps - dt - mf.debut) / mf.duree);
    const k1 = plage((e.temps - mf.debut) / mf.duree);
    if (k1 > 0 && k0 < 1) {
      segments.push([cheminMicrofibre(adoucir(k0), aspect), cheminMicrofibre(adoucir(k1), aspect), mf.rayon]);
    }

    const p = pinceauRef.current;
    if (!affiche && p && p.t >= 0 && performance.now() - p.t < 150) {
      const point = new THREE.Vector2(p.x * aspect, p.y);
      const rayon = tactile ? REGLAGES.rayonPinceau.doigt : REGLAGES.rayonPinceau.souris;
      const depart = !p.nouveau && e.precedent && e.precedent.distanceTo(point) < 0.5 ? e.precedent : point;
      segments.push([depart, point, rayon]);
      e.precedent = point;
      p.nouveau = false;
    } else {
      e.precedent = null;
    }

    if (tactile && !affiche && e.temps > bl.premier) {
      const phase = (e.temps - bl.premier) % bl.periode;
      if (phase < bl.duree + dt) {
        const a0 = adoucir(plage((phase - dt) / bl.duree));
        const a1 = adoucir(plage(phase / bl.duree));
        for (const rayon of [0.5, 0.78, 1.06]) {
          segments.push([pointBalayage(a0, aspect, rayon), pointBalayage(a1, aspect, rayon), 0.15]);
        }
      }
    }

    // 3. Masque d'essuyage (ping-pong).
    const source = r.masques[e.courant]!;
    const destination = r.masques[1 - e.courant]!;
    const u = r.matMasque.uniforms;
    u.tPrecedent!.value = source.texture;
    u.uDt!.value = dt;
    u.uAspect!.value = aspect;
    u.uGraine!.value = (e.images % 997) * 1.37;
    u.uNbSegments!.value = Math.min(segments.length, 6);
    segments.slice(0, 6).forEach(([a, b, rayon], i) => {
      (u.uSegments!.value as THREE.Vector4[])[i]!.set(a.x, a.y, b.x, b.y);
      (u.uRayons!.value as number[])[i] = rayon;
    });
    r.quad.material = r.matMasque;
    gl.setRenderTarget(destination);
    gl.render(r.scenePleinEcran, r.cameraPleinEcran);
    e.courant = 1 - e.courant;

    // 4. Voiture : léger balancement et parallaxe du pointeur (reflets qui glissent).
    const voiture = scene.getObjectByName("voiture");
    if (voiture) {
      const cible = p && p.t >= 0 && !tactile ? p.x - 0.5 : 0;
      e.parallaxe += (cible - e.parallaxe) * Math.min(1, dt * 2);
      voiture.rotation.y = -0.85 + Math.sin(e.temps * 0.22) * 0.1 + e.parallaxe * 0.16;
    }

    // 5. Scène dans une texture, puis composition à l'écran.
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(r.scene);
    gl.render(scene, camera);

    const c = r.matComposition.uniforms;
    c.tMasque!.value = destination.texture;
    c.uTemps!.value = e.temps;
    c.uAspect!.value = aspect;
    c.uApparition!.value = plage(e.temps / 0.6);
    r.quad.material = r.matComposition;
    gl.setRenderTarget(null);
    gl.render(r.scenePleinEcran, r.cameraPleinEcran);

    if (e.images === 2) onPret();
    if (affiche && e.temps > mf.debut + mf.duree + 0.3) {
      (window as Window & { __affichePrete?: boolean }).__affichePrete = true;
    }
  }, 1);

  return null;
}

export default function ScenePareBrise({ actif, ...props }: PropsScene) {
  return (
    <Canvas
      aria-hidden="true"
      tabIndex={-1}
      frameloop={actif ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: !!props.affiche,
      }}
      camera={{ fov: 26, near: 0.5, far: 60, position: [0, 1.45, 12.5] }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 7, 6]} intensity={1.6} color="#e8f6ff" />
      <directionalLight position={[-6, 3, -5]} intensity={1.2} color="#2ee6d6" />
      <group name="voiture">
        <VoitureGenerique gabarit="M" />
      </group>
      <Rendu {...props} />
    </Canvas>
  );
}
