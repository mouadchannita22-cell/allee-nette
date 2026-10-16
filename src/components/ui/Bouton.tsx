import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primaire" | "secondaire" | "fantome";
type Taille = "sm" | "md" | "lg";

const base =
  "reflet inline-flex items-center justify-center gap-2 rounded-full font-semibold text-center leading-tight " +
  "transition-[transform,box-shadow,background-color,border-color] duration-300 ease-glisse " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variantes: Record<Variante, string> = {
  primaire: "bg-aqua text-nuit shadow-eclat hover:bg-[#5ff1e4]",
  secondaire: "border border-bord text-texte hover:border-accent hover:bg-texte/5",
  fantome: "text-texte hover:bg-texte/5",
};

const tailles: Record<Taille, string> = {
  sm: "min-h-10 px-4 py-2 text-sm",
  md: "min-h-12 px-6 py-3 text-[0.95rem]",
  lg: "min-h-14 px-7 py-3.5 text-base",
};

export function classesBouton(variante: Variante = "primaire", taille: Taille = "md", className = "") {
  return `${base} ${variantes[variante]} ${tailles[taille]} ${className}`;
}

type Commun = { variante?: Variante; taille?: Taille; className?: string; children: ReactNode };

type PropsLien = Commun & Omit<ComponentProps<"a">, "className" | "children"> & { href: string };
type PropsBouton = Commun & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };

/** Bouton d'appel à l'action. Avec `href`, rend un lien (interne via next/link). */
export function Bouton(props: PropsLien | PropsBouton) {
  const { variante, taille, className, children, ...reste } = props;
  const classes = classesBouton(variante, taille, className);

  if (reste.href !== undefined) {
    const { href, ...attributs } = reste as Omit<PropsLien, keyof Commun>;
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={classes} {...attributs}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={classes} {...attributs}>
        {children}
      </a>
    );
  }

  const { type = "button", ...attributs } = reste as Omit<PropsBouton, keyof Commun>;
  return (
    <button type={type} className={classes} {...attributs}>
      {children}
    </button>
  );
}
