"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { creerEnvironnement } from "./eclairage";
import { type Gabarit, VoitureAnimee } from "./VoitureAnimee";

/** Studio : carte d'environnement pour les reflets, créée une fois. */
function Studio({ onPret }: { onPret: () => void }) {
  const gl = useThree((s) => s.gl);
  const environnement = useRef<THREE.WebGLRenderTarget | null>(null);
  const images = useRef(0);

  useEffect(() => {
    const carte = creerEnvironnement(gl);
    environnement.current = carte;
    return () => {
      environnement.current = null;
      carte.dispose();
    };
  }, [gl]);

  useFrame((state) => {
    const carte = environnement.current;
    if (carte && state.scene.environment !== carte.texture) state.scene.environment = carte.texture;
    images.current += 1;
    if (images.current === 3) onPret();
  });

  return null;
}

/** Vitrine de la page Tarifs : la voiture du gabarit choisi, en 3D. */
export default function SceneGabarits({
  gabarit,
  actif,
  onPret,
}: {
  gabarit: Gabarit;
  actif: boolean;
  onPret: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      tabIndex={-1}
      frameloop={actif ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 24, near: 0.5, far: 40, position: [0, 1.6, 10.2] }}
      onCreated={({ camera }) => camera.lookAt(0, 0.72, 0)}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Studio onPret={onPret} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 7, 6]} intensity={1.4} color="#e8f6ff" />
      <directionalLight position={[-6, 3, -5]} intensity={1} color="#2ee6d6" />
      <VoitureAnimee gabarit={gabarit} />
    </Canvas>
  );
}
