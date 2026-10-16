import Link from "next/link";
import { site, zoneActive } from "@/config/site";
import { liensInfos, liensLegaux, prestations } from "@/config/navigation";
import { lienEmail, lienTelephone, lienWhatsApp } from "@/lib/contact";
import { Logo } from "@/components/marque/Logo";
import { ACompleter } from "@/components/ui/ACompleter";
import { Bouton } from "@/components/ui/Bouton";
import { IconeMail, IconeMessage, IconeTelephone } from "@/components/ui/Icones";
import { Vague } from "./Vague";
import { ReglageCurseur } from "@/components/fx/ReglageCurseur";

const classeLien = "text-doux transition-colors hover:text-texte";

export function PiedDePage() {
  const telephone = lienTelephone();
  const whatsapp = lienWhatsApp("Bonjour Allée Nette, je souhaite un nettoyage de ma voiture.");
  const email = lienEmail();

  return (
    <footer className="mt-auto">
      <Vague />
      <div className="theme-sombre">
        <div className="conteneur grid gap-12 py-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo className="h-7 w-auto" />
            <p className="mt-5 max-w-xs text-doux">{site.promesse}</p>
            <p className="mt-3 max-w-xs text-sm text-doux">
              Nettoyage auto à domicile à {zoneActive.ville} et dans un rayon de {zoneActive.rayons.zone2} km.
            </p>
            <Bouton href="/reserver" className="mt-6">
              Réserver mon nettoyage
            </Bouton>
          </div>

          <nav aria-label="Prestations" className="md:col-span-3">
            <h2 className="font-titre text-sm font-semibold">Prestations</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {prestations.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={classeLien}>
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informations" className="md:col-span-2">
            <h2 className="font-titre text-sm font-semibold">Infos</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {liensInfos.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={classeLien}>
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <h2 className="font-titre text-sm font-semibold">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <IconeTelephone className="size-4 shrink-0 text-accent" />
                {telephone ? (
                  <a href={telephone} className={classeLien}>
                    {site.telephone}
                  </a>
                ) : (
                  <ACompleter libelle="téléphone" />
                )}
              </li>
              <li className="flex items-center gap-2.5">
                <IconeMessage className="size-4 shrink-0 text-accent" />
                {whatsapp ? (
                  <a href={whatsapp} className={classeLien} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                ) : (
                  <ACompleter libelle="WhatsApp" />
                )}
              </li>
              <li className="flex items-center gap-2.5">
                <IconeMail className="size-4 shrink-0 text-accent" />
                {email ? (
                  <a href={email} className={classeLien}>
                    {site.email}
                  </a>
                ) : (
                  <ACompleter libelle="e-mail" />
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-bord">
          <div className="conteneur flex flex-col gap-3 py-6 text-xs text-doux sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {site.nom} · {site.mentionTva}
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {liensLegaux.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={classeLien}>
                    {l.libelle}
                  </Link>
                </li>
              ))}
              <li>
                <ReglageCurseur />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
