"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type Etape = { titre: string; texte: string };

/** Maquette de téléphone en HTML/CSS : un écran par étape, en fondu. */
function Telephone({ ecrans, actif }: { ecrans: readonly ReactNode[]; actif: number }) {
  return (
    <div className="relative aspect-[9/18.5] w-[9.5rem] shrink-0 rounded-[2rem] border-[7px] border-[#1a2433] bg-nuit shadow-[0_30px_60px_-20px_rgb(11_18_32/0.55),0_0_0_1px_rgb(255_255_255/0.06)_inset] sm:w-[11rem] lg:w-[15.5rem] lg:rounded-[2.6rem] lg:border-[9px]">
      <div className="absolute left-1/2 top-1.5 z-20 h-4 w-14 -translate-x-1/2 rounded-full bg-[#1a2433] lg:top-2 lg:h-5 lg:w-20" />
      <div className="relative h-full overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#0f2a4a_0%,#0b1220_60%)] lg:rounded-[2rem]">
        {ecrans.map((ecran, i) => (
          <div
            key={i}
            className="absolute inset-0 px-3 pb-4 pt-8 text-[0.55rem] leading-snug text-ecume transition-[opacity,transform] duration-500 ease-glisse lg:px-4 lg:pt-11 lg:text-[0.7rem]"
            style={{
              opacity: i === actif ? 1 : 0,
              transform: `translateY(${i === actif ? 0 : i < actif ? -12 : 12}px)`,
            }}
          >
            {ecran}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Jauge d'eau : elle se remplit d'un quart à chaque étape. */
function Jauge({ niveau, etape, total }: { niveau: number; etape: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-40 w-5 overflow-hidden rounded-full border border-profond/25 bg-blanc/60 sm:h-48 lg:h-80 lg:w-7">
        <div
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#2ee6d6,#19c3b1)] transition-[height] duration-1000 ease-glisse"
          style={{ height: `${niveau * 100}%` }}
        >
          <svg viewBox="0 0 56 8" preserveAspectRatio="none" className="vague-jauge absolute -top-1.5 left-0 h-2 w-[200%]">
            <path d="M0 4 Q7 0 14 4 T28 4 T42 4 T56 4 V8 H0Z" fill="#2ee6d6" />
          </svg>
        </div>
      </div>
      <span className="font-titre text-xs font-bold tabular-nums text-accent">
        {String(etape + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
      </span>
    </div>
  );
}

/**
 * « Comment ça marche » épinglé au défilement : le téléphone reste à l'écran
 * (position sticky) pendant que les étapes défilent ; l'étape au milieu de
 * l'écran choisit l'écran du téléphone et le niveau de la jauge.
 *
 * Sans JavaScript, les quatre étapes restent lisibles, le téléphone montre la
 * première. Aucune bibliothèque : CSS sticky et IntersectionObserver.
 */
export function EtapesEpinglees({ etapes, ecrans }: { etapes: readonly Etape[]; ecrans: readonly ReactNode[] }) {
  const [actif, setActif] = useState(0);
  const liste = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const elements = liste.current?.querySelectorAll<HTMLElement>("[data-etape]");
    if (!elements?.length) return;
    // Une étape devient active quand elle traverse une bande fine : au milieu
    // de l'écran sur ordinateur, sous le téléphone épinglé sur mobile.
    const large = window.matchMedia("(min-width: 64rem)").matches;
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) setActif(Number((e.target as HTMLElement).dataset.etape));
        }
      },
      { rootMargin: large ? "-48% 0px -48% 0px" : "-70% 0px -26% 0px" },
    );
    elements.forEach((el) => observateur.observe(el));
    return () => observateur.disconnect();
  }, []);

  return (
    <div className="mt-12 grid lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div
        aria-hidden="true"
        className="sticky top-[4.5rem] z-10 -mx-4 flex items-center justify-center gap-6 bg-[linear-gradient(180deg,var(--fond)_82%,transparent)] px-4 pb-8 pt-4 sm:-mx-6 sm:px-6 lg:order-2 lg:top-24 lg:mx-0 lg:h-[calc(100svh-7rem)] lg:bg-none lg:p-0"
      >
        <Telephone ecrans={ecrans} actif={actif} />
        <Jauge niveau={(actif + 1) / etapes.length} etape={actif} total={etapes.length} />
      </div>
      <ol ref={liste} className="lg:order-1">
        {etapes.map((e, i) => (
          <li
            key={e.titre}
            data-etape={i}
            aria-current={i === actif ? "step" : undefined}
            className="flex min-h-[55svh] items-center lg:min-h-[80svh]"
          >
            <div
              className={`w-full rounded-carte border p-6 transition-[border-color,box-shadow,transform] duration-500 ease-glisse sm:p-8 ${
                i === actif ? "border-accent/50 bg-blanc shadow-douce lg:translate-x-2" : "border-bord bg-blanc/70"
              }`}
            >
              <span className="font-titre text-sm font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-3 font-sans text-xl font-bold leading-snug tracking-normal lg:text-2xl">{e.titre}</h3>
              <p className="mt-2 text-doux lg:text-lg">{e.texte}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
