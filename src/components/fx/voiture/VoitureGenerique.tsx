"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { construireVoiture, PROFILS } from "./geometrie";
import { creerFlaque, creerMateriaux, creerOmbre } from "./materiaux";

export type Gabarit = keyof typeof PROFILS;

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
