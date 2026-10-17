import { DOSSIER_LOGOS_PAIEMENT, FORMATS_LOGO, LOGOS_PAIEMENT } from "@/data/paiement";

/**
 * Fichiers officiels présents dans public/paiement/logos/, relevés au build
 * par next.config.ts (LOGOS_PAIEMENT_PRESENTS, par exemple « visa.svg,cb.svg »).
 */
function fichiersPresents(): readonly string[] {
  // Écrit en toutes lettres pour que Next le remplace au build.
  return (process.env.LOGOS_PAIEMENT_PRESENTS ?? "").split(",").filter(Boolean);
}

/** Chemin public du logo officiel d'un moyen de paiement, ou `null` s'il n'a pas été déposé. */
export function fichierLogo(id: string, presents: readonly string[]): string | null {
  const format = FORMATS_LOGO.find((f) => presents.includes(`${id}.${f}`));
  return format ? `${DOSSIER_LOGOS_PAIEMENT}/${id}.${format}` : null;
}

/**
 * Moyens de paiement acceptés en ligne (partie 10.3 du brief). Logos
 * officiels s'ils ont été déposés (public/paiement/logos/LISEZMOI.md),
 * sinon libellés texte sobres : jamais un dessin qui imite une marque.
 */
export function LogosPaiement({ className = "" }: { className?: string }) {
  const presents = fichiersPresents();
  return (
    <ul aria-label="Moyens de paiement acceptés en ligne" className={`flex flex-wrap items-center gap-2 ${className}`}>
      {LOGOS_PAIEMENT.map(({ id, libelle }) => {
        const fichier = fichierLogo(id, presents);
        return (
          <li
            key={id}
            className="flex h-8 items-center rounded-md border border-bord bg-blanc px-2.5 text-xs font-semibold text-doux"
          >
            {fichier ? (
              // Fichier officiel tel que fourni par l'émetteur (SVG compris) : ni recadré ni recompressé.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fichier} alt={libelle} className="h-5 w-auto" loading="lazy" decoding="async" />
            ) : (
              libelle
            )}
          </li>
        );
      })}
    </ul>
  );
}
