import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export function IconeTelephone(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

/** Bulle de discussion générique (le logo WhatsApp n'est pas redessiné). */
export function IconeMessage(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth={2.6} />
    </svg>
  );
}

export function IconeMail(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function IconeGoutte(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
    </svg>
  );
}

export function IconeMenu(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function IconeFermer(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconeChevron(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconeFleche(props: Props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeCalendrier(props: Props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
