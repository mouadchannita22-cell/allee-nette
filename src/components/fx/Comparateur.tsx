"use client";

import Image from "next/image";
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import type { PhotoRealisation } from "@/data/realisations";

/** Ressort de la poignée : raideur et amortissement (légèrement sous-amorti, sans rebond visible). */
const RAIDEUR = 170;
const AMORTISSEMENT = 2 * Math.sqrt(RAIDEUR) * 0.9;

function Volet({ photo, cote, libelle }: { photo?: PhotoRealisation; cote: "avant" | "apres"; libelle: string }) {
  if (photo) {
    return <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />;
  }
  // Emplacement marqué tant que nous n'avons pas nos propres photos.
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center text-center ${
        cote === "avant" ? "volet-avant" : "volet-apres"
      }`}
    >
      <span className="font-titre text-lg font-bold">Photo à venir</span>
      <span className="mt-1 text-sm text-doux">
        {libelle}, {cote === "avant" ? "avant" : "après"}
      </span>
    </div>
  );
}

/**
 * Avant/après « glisser pour nettoyer » : la raclette découvre la photo
 * « après ». Souris, doigt (le défilement vertical reste libre) et clavier
 * (flèches, Origine, Fin, Page précédente/suivante). La poignée suit le
 * pointeur avec un ressort doux ; en mouvement réduit, elle saute directement.
 */
export function Comparateur({ libelle, avant, apres }: { libelle: string; avant?: PhotoRealisation; apres?: PhotoRealisation }) {
  const cadre = useRef<HTMLDivElement>(null);
  const [valeur, setValeur] = useState(30);
  const ressort = useRef({ position: 30, vitesse: 0, cible: 30, image: 0, glisse: false });

  /** Anime la position affichée vers la cible, sans re-rendu React à chaque image. */
  const animer = () => {
    const r = ressort.current;
    if (r.image) return;
    let avant = performance.now();
    const pas = (maintenant: number) => {
      const dt = Math.min((maintenant - avant) / 1000, 1 / 30);
      avant = maintenant;
      const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduit) {
        r.position = r.cible;
        r.vitesse = 0;
      } else {
        r.vitesse += (RAIDEUR * (r.cible - r.position) - AMORTISSEMENT * r.vitesse) * dt;
        r.position += r.vitesse * dt;
      }
      cadre.current?.style.setProperty("--position", `${r.position}%`);
      if (Math.abs(r.cible - r.position) < 0.05 && Math.abs(r.vitesse) < 0.05) {
        r.position = r.cible;
        cadre.current?.style.setProperty("--position", `${r.position}%`);
        r.image = 0;
        return;
      }
      r.image = requestAnimationFrame(pas);
    };
    r.image = requestAnimationFrame(pas);
  };

  const viser = (pourcentage: number) => {
    const cible = Math.min(100, Math.max(0, pourcentage));
    ressort.current.cible = cible;
    setValeur(Math.round(cible));
    animer();
  };

  // Indice au premier passage à l'écran : la raclette glisse jusqu'au milieu.
  const indice = useEffectEvent(() => {
    if (!ressort.current.glisse) viser(50);
  });

  useEffect(() => {
    const element = cadre.current;
    const r = ressort.current;
    if (!element) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree?.isIntersecting) return;
        observateur.disconnect();
        indice();
      },
      { threshold: 0.6 },
    );
    observateur.observe(element);
    return () => {
      observateur.disconnect();
      cancelAnimationFrame(r.image);
    };
  }, []);

  const depuisPointeur = (e: PointerEvent<HTMLDivElement>) => {
    const r = cadre.current?.getBoundingClientRect();
    if (r) viser(((e.clientX - r.left) / r.width) * 100);
  };

  const clavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const pas: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 };
    if (e.key === "Home") viser(0);
    else if (e.key === "End") viser(100);
    else if (e.key in pas) viser(ressort.current.cible + pas[e.key]!);
    else return;
    ressort.current.glisse = true;
    e.preventDefault();
  };

  return (
    <div
      ref={cadre}
      className="comparateur relative aspect-[4/3] touch-pan-y select-none overflow-hidden rounded-carte border border-bord"
      style={{ "--position": "30%" } as CSSProperties}
      onPointerDown={(e) => {
        ressort.current.glisse = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        depuisPointeur(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) depuisPointeur(e);
      }}
    >
      <Volet photo={apres} cote="apres" libelle={libelle} />
      <div className="absolute inset-0" style={{ clipPath: "inset(0 calc(100% - var(--position)) 0 0)" }}>
        <Volet photo={avant} cote="avant" libelle={libelle} />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${libelle} : avant et après`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valeur}
        aria-valuetext={`${100 - valeur} % nettoyé`}
        onKeyDown={clavier}
        className="absolute inset-y-0 left-[var(--position)] w-12 -translate-x-1/2 cursor-ew-resize rounded-full focus-visible:outline-offset-[-6px]"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-aqua shadow-[0_0_12px_#2ee6d6]" />
        {/* Poignée en forme de raclette. */}
        <svg aria-hidden="true" viewBox="0 0 48 64" className="absolute left-1/2 top-1/2 h-16 w-12 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_6px_14px_rgb(0_0_0/0.45)]">
          <rect x="4" y="2" width="40" height="12" rx="6" fill="#2ee6d6" />
          <rect x="20" y="12" width="8" height="40" rx="4" fill="#f3fafc" />
          <path d="M18 24 l-6 8 6 8 M30 24 l6 8 -6 8" fill="none" stroke="#0b1220" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-nuit/70 px-2.5 py-1 text-xs font-semibold text-ecume">Avant</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-nuit/70 px-2.5 py-1 text-xs font-semibold text-ecume">Après</span>
    </div>
  );
}
