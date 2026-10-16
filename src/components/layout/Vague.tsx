// Deux vagues périodiques (période 1 440) sur 2 880 unités : une translation de -50 % boucle sans saut.
const VAGUE_AVANT =
  "M0 64C240 24 480 24 720 64S1200 104 1440 64S1920 24 2160 64S2640 104 2880 64V120H0Z";
const VAGUE_ARRIERE =
  "M0 52C260 88 460 88 720 52S1180 16 1440 52S1900 88 2160 52S2620 16 2880 52V120H0Z";

/** Vague animée posée au-dessus du pied de page. */
export function Vague() {
  return (
    <div aria-hidden="true" className="vague-fond relative -mb-px h-14 overflow-hidden sm:h-20">
      <svg
        className="vague-anim-lente absolute bottom-0 left-0 h-full w-[200%]"
        viewBox="0 0 2880 120"
        preserveAspectRatio="none"
      >
        <path d={VAGUE_ARRIERE} fill="var(--color-turquoise)" fillOpacity="0.28" />
      </svg>
      <svg className="vague-anim absolute bottom-0 left-0 h-full w-[200%]" viewBox="0 0 2880 120" preserveAspectRatio="none">
        <path d={VAGUE_AVANT} fill="var(--color-nuit)" />
      </svg>
    </div>
  );
}
