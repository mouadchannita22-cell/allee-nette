"use client";

import { Bouton } from "@/components/ui/Bouton";
import { IconeMessage, IconeTelephone } from "@/components/ui/Icones";

type Props = { telephone: string | null; whatsapp: string | null };

const classeAction =
  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-[0.7rem] font-semibold text-texte transition-colors hover:bg-texte/8";

/**
 * Barre fixe en bas d'écran sur mobile : Réserver, Appeler, WhatsApp.
 * Masquée sur les pages de réservation (`data-sans-barre-mobile`, globals.css).
 */
export function BarreMobile({ telephone, whatsapp }: Props) {
  return (
    <nav
      aria-label="Actions rapides"
      data-barre-mobile=""
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="verre theme-sombre grid grid-cols-[1fr_auto_auto] items-center gap-1.5 rounded-2xl p-1.5 shadow-2xl">
        <Bouton href="/reserver" taille="md" className="min-h-12 rounded-xl">
          Réserver
        </Bouton>
        <ActionContact href={telephone} libelle="Appeler" absent="Numéro à venir">
          <IconeTelephone className="size-5" />
        </ActionContact>
        <ActionContact href={whatsapp} libelle="WhatsApp" absent="WhatsApp à venir" externe>
          <IconeMessage className="size-5" />
        </ActionContact>
      </div>
    </nav>
  );
}

function ActionContact({
  href,
  libelle,
  absent,
  externe = false,
  children,
}: {
  href: string | null;
  libelle: string;
  absent: string;
  externe?: boolean;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span className={`${classeAction} opacity-50`} aria-disabled="true" title={absent}>
        {children}
        {libelle}
      </span>
    );
  }
  return (
    <a
      href={href}
      className={classeAction}
      {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {libelle}
    </a>
  );
}
