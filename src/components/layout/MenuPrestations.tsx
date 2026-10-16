"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { prestations } from "@/config/navigation";
import { IconeChevron } from "@/components/ui/Icones";

/** Sous-menu « Prestations » : se ferme au clic extérieur, avec Échap ou au choix d'un lien. */
export function MenuPrestations({ cheminActuel }: { cheminActuel: string }) {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const actif = prestations.some((p) => p.href === cheminActuel);

  useEffect(() => {
    if (!ouvert) return;
    const clicExterieur = (e: PointerEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", clicExterieur);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("pointerdown", clicExterieur);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  return (
    <div ref={conteneur} className="relative">
      <button
        ref={bouton}
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:text-texte ${
          actif ? "bg-texte/8 text-texte" : "text-doux"
        }`}
      >
        Prestations
        <IconeChevron className={`size-4 transition-transform duration-300 ${ouvert ? "rotate-180" : ""}`} />
      </button>
      <div
        id={id}
        hidden={!ouvert}
        // Fond opaque : un flou d'arrière-plan imbriqué dans la barre en verre ne s'applique pas.
        className="absolute left-1/2 top-[calc(100%+0.75rem)] w-80 -translate-x-1/2 rounded-3xl border border-bord bg-nuit p-2 shadow-2xl"
      >
        <ul>
          {prestations.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                onClick={() => setOuvert(false)}
                aria-current={cheminActuel === p.href ? "page" : undefined}
                className="block rounded-2xl px-4 py-3 transition-colors hover:bg-texte/6 aria-[current=page]:bg-texte/8"
              >
                <span className="block text-sm font-semibold text-texte">{p.libelle}</span>
                {p.description && <span className="mt-0.5 block text-[0.8rem] text-doux">{p.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
