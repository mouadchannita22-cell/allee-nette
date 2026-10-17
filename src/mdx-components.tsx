import { Children, type ComponentPropsWithoutRef, type ReactNode } from "react";
import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { ancre, texteBrut } from "@/lib/ancre";
import { fr } from "@/lib/typo";
import { CLASSES_TEXTE } from "@/components/legal/classes";

/**
 * Composants de rendu des fichiers MDX (src/content/*.mdx), exigés par
 * @next/mdx avec l'App Router. Chaque balise Markdown reçoit la typographie
 * du site ; les titres reçoivent une ancre tirée de leur texte
 * (« ## Vos droits » → id="vos-droits"), pour les liens directs.
 */

/**
 * Typographie française (espaces insécables) sur le texte d'un bloc. Les
 * morceaux voisins sont recollés d'abord : « {CONDITIONS.priseElectriqueMetres} m »
 * arrive en deux morceaux (le nombre, puis « m ») et doit rester sur une ligne.
 */
function typo(children: ReactNode): ReactNode[] {
  const resultat: ReactNode[] = [];
  let texte = "";
  for (const morceau of Children.toArray(children)) {
    if (typeof morceau === "string" || typeof morceau === "number") {
      texte += String(morceau);
      continue;
    }
    if (texte) resultat.push(fr(texte));
    texte = "";
    resultat.push(morceau);
  }
  if (texte) resultat.push(fr(texte));
  return resultat;
}

/** Lien interne (navigation du site), ancre de la page, ou lien externe. */
function Lien({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={CLASSES_TEXTE.lien}>
        {children}
      </Link>
    );
  }
  const externe = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={CLASSES_TEXTE.lien}
      {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      {children}
      {externe && <span className="sr-only"> (nouvel onglet)</span>}
    </a>
  );
}

const composants = {
  h2: ({ id, children }: ComponentPropsWithoutRef<"h2">) => (
    <h2 id={id ?? ancre(texteBrut(children))} className={CLASSES_TEXTE.h2}>
      {typo(children)}
    </h2>
  ),
  h3: ({ id, children }: ComponentPropsWithoutRef<"h3">) => (
    <h3 id={id ?? ancre(texteBrut(children))} className={CLASSES_TEXTE.h3}>
      {typo(children)}
    </h3>
  ),
  p: ({ children }: ComponentPropsWithoutRef<"p">) => <p className={CLASSES_TEXTE.p}>{typo(children)}</p>,
  ul: ({ children }: ComponentPropsWithoutRef<"ul">) => <ul className={CLASSES_TEXTE.ul}>{children}</ul>,
  ol: ({ children }: ComponentPropsWithoutRef<"ol">) => <ol className={CLASSES_TEXTE.ol}>{children}</ol>,
  li: ({ children }: ComponentPropsWithoutRef<"li">) => <li className={CLASSES_TEXTE.li}>{typo(children)}</li>,
  strong: ({ children }: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-texte">{typo(children)}</strong>
  ),
  blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className={CLASSES_TEXTE.citation}>{children}</blockquote>
  ),
  hr: () => <hr className="my-12 border-bord" />,
  a: Lien,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return composants;
}
