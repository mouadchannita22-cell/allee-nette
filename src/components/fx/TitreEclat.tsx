import type { ComponentProps, CSSProperties } from "react";

/**
 * Titre traversé par un éclat, lettre après lettre. Les lettres sont lisibles
 * dès le premier rendu (aucune n'apparaît en fondu) : le titre reste l'élément
 * LCP. Animation CSS uniquement, coupée en mouvement réduit.
 *
 * Les lecteurs d'écran lisent le texte entier, pas les lettres une à une.
 */
export function TitreEclat({ texte, className, ...props }: { texte: string } & Omit<ComponentProps<"h1">, "children">) {
  const mots = texte.split(" ");
  // Rang de la première lettre de chaque mot, pour décaler l'éclat.
  const debuts = mots.map((_, m) => mots.slice(0, m).join("").length);

  return (
    <h1 className={className} {...props}>
      <span className="sr-only">{texte}</span>
      <span aria-hidden="true">
        {mots.map((mot, m) => (
          <span key={m}>
            <span className="whitespace-nowrap">
              {[...mot].map((lettre, l) => (
                <span key={l} className="eclat-lettre" style={{ "--i": debuts[m]! + l } as CSSProperties}>
                  {lettre}
                </span>
              ))}
            </span>
            {m < mots.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </h1>
  );
}
