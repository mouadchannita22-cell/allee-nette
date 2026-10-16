import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/marque/Logo";
import { Bouton } from "@/components/ui/Bouton";
import { MenuMobile } from "./MenuMobile";
import { NavPrincipale } from "./NavPrincipale";

/** Navigation en verre dépoli, qui se réduit au défilement (CSS, sans JavaScript). */
export function EnTete() {
  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4"
      style={{ viewTransitionName: "site-header" }}
    >
      <div aria-hidden="true" className="barre-progression fixed inset-x-0 top-0 z-[60] h-0.5 bg-aqua" />
      <div className="nav-pilule verre theme-sombre pointer-events-auto mx-auto flex max-w-6xl items-center gap-3 rounded-full py-2.5 pl-5 pr-2.5">
        <Link href="/" className="shrink-0 py-1" aria-label="Allée Nette, retour à l'accueil">
          <Logo titre={null} className="h-[1.15rem] w-auto sm:h-6" />
        </Link>
        <Suspense fallback={<div className="hidden flex-1 md:block" />}>
          <NavPrincipale />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {/* Sur mobile, « Réserver » est dans la barre fixe en bas d'écran. */}
          <div className="hidden sm:block">
            <Bouton href="/reserver" taille="sm">
              Réserver
            </Bouton>
          </div>
          <MenuMobile />
        </div>
      </div>
    </header>
  );
}
