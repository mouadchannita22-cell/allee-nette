import { euros } from "@/lib/texte";

const CHIFFRES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Un rouleau de 0 à 9 : la transition CSS fait défiler jusqu'au bon chiffre. */
function Rouleau({ chiffre }: { chiffre: number }) {
  return (
    <span className="relative inline-block h-[1.1em] overflow-hidden align-bottom leading-[1.1]">
      <span className="invisible">0</span>
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-700 ease-ressort"
        style={{ transform: `translateY(${-1.1 * chiffre}em)` }}
      >
        {CHIFFRES.map((c) => (
          <span key={c} className="h-[1.1em]">
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * Montant en euros dont les chiffres roulent jusqu'à leur nouvelle valeur,
 * comme un compteur, avec un léger ressort. Les lecteurs d'écran lisent le
 * montant entier ; en mouvement réduit, il change d'un coup.
 */
export function ChiffreRoulant({ montant, className = "" }: { montant: number; className?: string }) {
  if (!Number.isInteger(montant) || montant < 0) return <span className={className}>{euros(montant)}</span>;
  const chiffres = String(montant).split("");
  return (
    <span className={`tabular-nums ${className}`}>
      <span className="sr-only">{euros(montant)}</span>
      <span aria-hidden="true" className="inline-flex items-end">
        {chiffres.map((c, i) => (
          // Clé comptée depuis la droite : les unités restent les unités quand le nombre s'allonge.
          <Rouleau key={chiffres.length - i} chiffre={Number(c)} />
        ))}
        <span className="leading-[1.1]">{" €"}</span>
      </span>
    </span>
  );
}
