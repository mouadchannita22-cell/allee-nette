"use client";

import { site } from "@/config/site";
import { lienEmail, lienTelephone, lienWhatsApp } from "@/lib/contact";
import { ACompleter } from "@/components/ui/ACompleter";
import { classesBouton } from "@/components/ui/Bouton";
import { IconeMail, IconeMessage, IconeTelephone } from "@/components/ui/Icones";

type Props = {
  /** Message prérempli dans WhatsApp. */
  messageWhatsApp: string;
  className?: string;
};

/**
 * Téléphone, WhatsApp et e-mail, pour ne jamais laisser une demande sans
 * issue. Une coordonnée non renseignée s'affiche « à compléter ».
 */
export function LiensContact({ messageWhatsApp, className = "" }: Props) {
  const telephone = lienTelephone();
  const whatsapp = lienWhatsApp(messageWhatsApp);
  const email = lienEmail();
  const lien = classesBouton("secondaire", "md", "w-full sm:w-auto");

  return (
    <ul className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
      <li>
        {telephone ? (
          <a href={telephone} className={lien}>
            <IconeTelephone className="size-5" />
            Appeler le {site.telephone}
          </a>
        ) : (
          <span className="text-sm">
            Téléphone : <ACompleter libelle="téléphone" />
          </span>
        )}
      </li>
      <li>
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={lien}>
            <IconeMessage className="size-5" />
            Écrire sur WhatsApp
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        ) : (
          <span className="text-sm">
            WhatsApp : <ACompleter libelle="numéro WhatsApp" />
          </span>
        )}
      </li>
      <li>
        {email ? (
          <a href={email} className={lien}>
            <IconeMail className="size-5" />
            {site.email}
          </a>
        ) : (
          <span className="text-sm">
            E-mail : <ACompleter libelle="e-mail" />
          </span>
        )}
      </li>
    </ul>
  );
}
