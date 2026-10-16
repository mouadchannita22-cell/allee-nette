"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { construireVoiture, PROFILS } from "./geometrie";

export type Gabarit = keyof typeof PROFILS;

/** Peinture, vitrage et optiques : reflets nets sur un vernis épais. */
function creerMateriaux() {
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
function creerOmbre() {
  const map = degradeRadial([
    [0, "rgba(0,0,0,0.85)"],
    [0.55, "rgba(0,0,0,0.45)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
}

/** Flaque de lumière des phares sur le sol, en mélange additif. */
function creerFlaque() {
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

export function VoitureGenerique({ gabarit = "M", ...props }: { gabarit?: Gabarit } & ThreeElements["group"]) {
  const profil = PROFILS[gabarit];
  const pieces = useMemo(() => construireVoiture(profil), [profil]);
  const materiaux = useMemo(() => creerMateriaux(), []);
  const ombre = useMemo(() => creerOmbre(), []);
  const flaque = useMemo(() => creerFlaque(), []);

  useEffect(
    () => () => {
      for (const g of [pieces.caisse, pieces.basDeCaisse, pieces.vitrage, pieces.toit, pieces.phares, pieces.feux, pieces.pneu, pieces.jante]) {
        g.dispose();
      }
    },
    [pieces],
  );
  useEffect(
    () => () => {
      Object.values(materiaux).forEach((m) => m.dispose());
      for (const m of [ombre, flaque]) {
        m.map?.dispose();
        m.dispose();
      }
    },
    [materiaux, ombre, flaque],
  );

  return (
    <group {...props}>
      <mesh geometry={pieces.caisse} material={materiaux.peinture} />
      <mesh geometry={pieces.basDeCaisse} material={materiaux.garniture} />
      <mesh geometry={pieces.toit} material={materiaux.peinture} />
      <mesh geometry={pieces.vitrage} material={materiaux.vitrage} />
      <mesh geometry={pieces.phares} material={materiaux.phares} />
      <mesh geometry={pieces.feux} material={materiaux.feux} />
      {pieces.roues.map((c, i) => (
        <group key={i} position={c}>
          <mesh geometry={pieces.pneu} material={materiaux.pneu} />
          <mesh geometry={pieces.jante} material={materiaux.jante} />
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} material={ombre}>
        <planeGeometry args={[profil.longueur * 1.45, profil.largeur * 2.1]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[profil.longueur / 2 + 0.95, 0.01, 0]} material={flaque}>
        <planeGeometry args={[2.6, profil.largeur * 1.5]} />
      </mesh>
    </group>
  );
}
