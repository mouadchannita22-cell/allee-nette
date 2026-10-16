import { LOGO_GOUTTE, LOGO_TEXTE, LOGO_VIEWBOX } from "./logo-chemins";

type Props = {
  className?: string;
  /** Titre accessible. Mettre `null` si le logo est déjà nommé par son lien parent. */
  titre?: string | null;
};

/** Logotype « Allée Nette » : le texte prend la couleur courante, la goutte reste aqua. */
export function Logo({ className, titre = "Allée Nette" }: Props) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={titre ? "img" : undefined}
      aria-label={titre ?? undefined}
      aria-hidden={titre ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id="logo-goutte" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-aqua)" />
          <stop offset="1" stopColor="var(--color-turquoise)" />
        </linearGradient>
      </defs>
      <path fill="currentColor" d={LOGO_TEXTE} />
      <path fill="url(#logo-goutte)" d={LOGO_GOUTTE} />
    </svg>
  );
}
