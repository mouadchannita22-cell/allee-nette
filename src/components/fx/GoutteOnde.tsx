import type { CSSProperties } from "react";

/**
 * Une goutte tombe sur une surface d'eau et s'étale en ondes (section « Sans
 * rinçage »). Animation CSS jouée une fois par <AuPassage> ; sans JavaScript
 * ou en mouvement réduit, l'illustration est fixe. Décoratif.
 */
export function GoutteOnde({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 200" className={`goutte-onde ${className}`}>
      <defs>
        <radialGradient id="goutte-reflet" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#5ff1e4" />
          <stop offset="1" stopColor="#0e7c74" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="160" rx="96" ry="18" fill="#2ee6d6" opacity="0.1" />
      {[0, 1, 2].map((i) => (
        <ellipse
          key={i}
          className="onde"
          cx="110"
          cy="160"
          rx={34 + i * 26}
          ry={8 + i * 5}
          fill="none"
          stroke="#19c3b1"
          strokeWidth="2"
          style={{ animationDelay: `${0.68 + i * 0.16}s`, opacity: 0.7 - i * 0.2 }}
        />
      ))}
      {[-1, 1].map((sens) => (
        <circle key={sens} className="eclaboussure" cx="110" cy="152" r="3.5" fill="#2ee6d6" style={{ "--sens": sens } as CSSProperties} />
      ))}
      <path className="goutte" d="M110 20 C 110 20, 88 50, 88 66 a 22 22 0 0 0 44 0 C 132 50, 110 20, 110 20 Z" fill="url(#goutte-reflet)" />
    </svg>
  );
}
