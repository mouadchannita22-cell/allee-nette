"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationPrincipale } from "@/config/navigation";
import { MenuPrestations } from "./MenuPrestations";

const classeLien =
  "rounded-full px-3.5 py-2 text-sm font-medium text-doux transition-colors hover:text-texte aria-[current=page]:text-texte aria-[current=page]:bg-texte/8";

export function NavPrincipale() {
  const chemin = usePathname();
  const [tarifs, ...autres] = navigationPrincipale;

  return (
    <nav aria-label="Navigation principale" className="hidden flex-1 justify-center md:flex">
      <ul className="flex items-center gap-1">
        {tarifs && (
          <li>
            <Link href={tarifs.href} className={classeLien} aria-current={chemin === tarifs.href ? "page" : undefined}>
              {tarifs.libelle}
            </Link>
          </li>
        )}
        <li>
          <MenuPrestations cheminActuel={chemin} />
        </li>
        {autres.map((lien) => (
          <li key={lien.href}>
            <Link href={lien.href} className={classeLien} aria-current={chemin === lien.href ? "page" : undefined}>
              {lien.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
