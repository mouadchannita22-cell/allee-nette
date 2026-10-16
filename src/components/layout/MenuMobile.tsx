"use client";

import Link from "next/link";
import { useRef } from "react";
import { liensInfos, navigationPrincipale, prestations } from "@/config/navigation";
import { Logo } from "@/components/marque/Logo";
import { Bouton } from "@/components/ui/Bouton";
import { IconeFermer, IconeMenu } from "@/components/ui/Icones";

/** Menu plein écran sur mobile, dans un <dialog> natif (piège du focus et Échap inclus). */
export function MenuMobile() {
  const dialogue = useRef<HTMLDialogElement>(null);
  const fermer = () => dialogue.current?.close();

  const liens = [
    ...navigationPrincipale.slice(0, 1),
    ...prestations,
    ...navigationPrincipale.slice(1),
    ...liensInfos.filter((l) => !navigationPrincipale.some((n) => n.href === l.href)),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => dialogue.current?.showModal()}
        className="flex size-10 items-center justify-center rounded-full text-texte transition-colors hover:bg-texte/8 md:hidden"
        aria-label="Ouvrir le menu"
        aria-haspopup="dialog"
      >
        <IconeMenu className="size-6" />
      </button>
      <dialog
        ref={dialogue}
        aria-label="Menu"
        className="theme-sombre m-0 h-dvh max-h-none w-full max-w-none p-0 backdrop:bg-nuit/70 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <Logo className="h-5 w-auto" />
          <button
            type="button"
            onClick={fermer}
            className="flex size-11 items-center justify-center rounded-full hover:bg-texte/8"
            aria-label="Fermer le menu"
          >
            <IconeFermer className="size-6" />
          </button>
        </div>
        <nav aria-label="Menu mobile" className="flex-1 overflow-y-auto px-6 py-8">
          <ul className="space-y-1">
            {liens.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={fermer}
                  className="block rounded-2xl px-3 py-3 font-titre text-xl font-semibold transition-colors hover:bg-texte/6"
                >
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Bouton href="/reserver" taille="lg" className="w-full" onClick={fermer}>
            Réserver mon nettoyage
          </Bouton>
        </div>
      </dialog>
    </>
  );
}
