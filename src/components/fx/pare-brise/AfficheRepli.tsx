"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Image de repli du héros (mode dégradé ou mouvement réduit) : une image
 * tirée de la scène 3D par scripts/generer-affiche-heros.ts.
 *
 * Elle est dessinée dans un canvas plutôt qu'affichée en <img> : une grande
 * image chargée après coup deviendrait l'élément LCP, à la place du titre.
 */
const IMAGES = {
  large: "/heros/pare-brise-large.avif",
  etroit: "/heros/pare-brise-etroit.avif",
} as const;

/** Quelques gouttes en CSS qui glissent lentement (mode dégradé uniquement). */
const GOUTTES = [
  { x: 12, y: 8, taille: 9, duree: 13, delai: 0 },
  { x: 27, y: 22, taille: 6, duree: 17, delai: 4 },
  { x: 46, y: 4, taille: 11, duree: 15, delai: 2 },
  { x: 63, y: 18, taille: 7, duree: 19, delai: 7 },
  { x: 78, y: 6, taille: 10, duree: 14, delai: 5 },
  { x: 91, y: 26, taille: 6, duree: 18, delai: 1 },
] as const;

export function AfficheRepli({ gouttes }: { gouttes: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [chargee, setChargee] = useState(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const image = new Image();
    image.decoding = "async";
    let annule = false;

    const dessiner = () => {
      const echelle = Math.min(window.devicePixelRatio || 1, 1.5);
      const largeur = Math.round(c.clientWidth * echelle);
      const hauteur = Math.round(c.clientHeight * echelle);
      if (!largeur || !hauteur || !image.naturalWidth) return;
      c.width = largeur;
      c.height = hauteur;
      // Recadrage « cover », centré.
      const ratio = Math.max(largeur / image.naturalWidth, hauteur / image.naturalHeight);
      const l = image.naturalWidth * ratio;
      const h = image.naturalHeight * ratio;
      c.getContext("2d")?.drawImage(image, (largeur - l) / 2, (hauteur - h) / 2, l, h);
    };

    image.onload = () => {
      if (annule) return;
      dessiner();
      setChargee(true);
    };
    image.src = c.clientWidth >= c.clientHeight ? IMAGES.large : IMAGES.etroit;
    const observateur = new ResizeObserver(dessiner);
    observateur.observe(c);
    return () => {
      annule = true;
      observateur.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvas}
        className="h-full w-full transition-opacity duration-700 ease-glisse"
        style={{ opacity: chargee ? 1 : 0 }}
      />
      {gouttes &&
        GOUTTES.map((g) => (
          <span
            key={g.x}
            className="goutte-css"
            style={{
              left: `${g.x}%`,
              top: `${g.y}%`,
              width: g.taille,
              height: g.taille * 1.15,
              animationDuration: `${g.duree}s`,
              animationDelay: `-${g.delai}s`,
            }}
          />
        ))}
    </div>
  );
}
