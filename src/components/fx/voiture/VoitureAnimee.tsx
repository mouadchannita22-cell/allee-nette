"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { construireVoiture, interpolerProfil, PROFILS, type ProfilVoiture } from "./geometrie";
import { creerMateriaux, creerOmbre } from "./materiaux";

export type Gabarit = keyof typeof PROFILS;

/** Durée de la transformation d'un gabarit à l'autre, en secondes. */
const DUREE = 0.75;

function adoucir(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Remplace la géométrie d'un maillage et libère l'ancienne. */
function remplacer(mesh: THREE.Mesh | null, geometrie: THREE.BufferGeometry) {
  if (!mesh) {
    geometrie.dispose();
    return;
  }
  const ancienne = mesh.geometry;
  mesh.geometry = geometrie;
  ancienne.dispose();
}

/**
 * Voiture qui se transforme quand le gabarit change : les cotes de la
 * silhouette sont interpolées et la géométrie reconstruite à chaque image de
 * la transition (citadine → berline → grand SUV), avec un léger rebond.
 */
export function VoitureAnimee({ gabarit }: { gabarit: Gabarit }) {
  // Géométrie de départ : le gabarit affiché au montage. Ensuite, seule la
  // boucle de rendu modifie la voiture (les props ci-dessous ne changent plus).
  const [p0] = useState(() => PROFILS[gabarit]);
  const [initiales] = useState(() => construireVoiture(p0));
  const materiaux = useMemo(() => creerMateriaux(), []);
  const ombre = useMemo(() => creerOmbre(), []);
  const roue = useMemo(() => {
    const pneu = new THREE.CylinderGeometry(1, 1, 0.24, 40, 1);
    pneu.rotateX(Math.PI / 2);
    const jante = new THREE.CylinderGeometry(0.66, 0.66, 0.245, 28, 1);
    jante.rotateX(Math.PI / 2);
    return { pneu, jante };
  }, []);

  const groupe = useRef<THREE.Group>(null);
  const caisse = useRef<THREE.Mesh>(null);
  const bas = useRef<THREE.Mesh>(null);
  const vitrage = useRef<THREE.Mesh>(null);
  const toit = useRef<THREE.Mesh>(null);
  const phares = useRef<THREE.Mesh>(null);
  const feux = useRef<THREE.Mesh>(null);
  const sol = useRef<THREE.Mesh>(null);
  const roues = useRef<(THREE.Group | null)[]>([]);
  const anim = useRef({
    de: PROFILS[gabarit] as ProfilVoiture,
    vers: PROFILS[gabarit] as ProfilVoiture,
    t: 1,
    temps: 0,
  });

  // Nouveau gabarit : la transformation part de la silhouette affichée.
  useEffect(() => {
    const a = anim.current;
    if (a.vers === PROFILS[gabarit]) return;
    a.de = a.t < 1 ? interpolerProfil(a.de, a.vers, adoucir(a.t)) : a.vers;
    a.vers = PROFILS[gabarit];
    a.t = 0;
  }, [gabarit]);

  useEffect(() => {
    const maillages = [caisse.current, bas.current, vitrage.current, toit.current, phares.current, feux.current];
    initiales.pneu.dispose();
    initiales.jante.dispose();
    return () => {
      maillages.forEach((m) => m?.geometry.dispose());
      Object.values(materiaux).forEach((m) => m.dispose());
      ombre.map?.dispose();
      ombre.dispose();
      roue.pneu.dispose();
      roue.jante.dispose();
    };
  }, [initiales, materiaux, ombre, roue]);

  useFrame((_, dt) => {
    const a = anim.current;
    a.temps += Math.min(dt, 0.1);

    if (a.t < 1) {
      a.t = Math.min(1, a.t + Math.min(dt, 0.1) / DUREE);
      const p = interpolerProfil(a.de, a.vers, adoucir(a.t));
      const pieces = construireVoiture(p);
      remplacer(caisse.current, pieces.caisse);
      remplacer(bas.current, pieces.basDeCaisse);
      remplacer(vitrage.current, pieces.vitrage);
      remplacer(toit.current, pieces.toit);
      remplacer(phares.current, pieces.phares);
      remplacer(feux.current, pieces.feux);
      pieces.pneu.dispose();
      pieces.jante.dispose();
      pieces.roues.forEach((position, i) => {
        const r = roues.current[i];
        r?.position.copy(position);
        r?.scale.set(p.rayonRoue, p.rayonRoue, 1);
      });
      sol.current?.scale.set(p.longueur * 1.45, p.largeur * 2.1, 1);
      // Rebond de suspension pendant la transformation.
      if (groupe.current) groupe.current.position.y = Math.sin(a.t * Math.PI) * 0.07;
    }

    if (groupe.current) groupe.current.rotation.y = -0.7 + Math.sin(a.temps * 0.3) * 0.32;
  });

  return (
    <group ref={groupe}>
      <mesh ref={caisse} geometry={initiales.caisse} material={materiaux.peinture} />
      <mesh ref={bas} geometry={initiales.basDeCaisse} material={materiaux.garniture} />
      <mesh ref={toit} geometry={initiales.toit} material={materiaux.peinture} />
      <mesh ref={vitrage} geometry={initiales.vitrage} material={materiaux.vitrage} />
      <mesh ref={phares} geometry={initiales.phares} material={materiaux.phares} />
      <mesh ref={feux} geometry={initiales.feux} material={materiaux.feux} />
      {initiales.roues.map((c, i) => (
        <group
          key={i}
          ref={(g) => {
            roues.current[i] = g;
          }}
          position={c}
          scale={[p0.rayonRoue, p0.rayonRoue, 1]}
        >
          <mesh geometry={roue.pneu} material={materiaux.pneu} />
          <mesh geometry={roue.jante} material={materiaux.jante} />
        </group>
      ))}
      <mesh ref={sol} rotation-x={-Math.PI / 2} position-y={0.005} scale={[p0.longueur * 1.45, p0.largeur * 2.1, 1]} material={ombre}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}
