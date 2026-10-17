import { estRenseigne, ouACompleter, site } from "@/config/site";
import { formaterTelephone } from "@/lib/telephone";

/** Lien `tel:` au format international, ou `null` si le numéro n'est pas renseigné. */
export function lienTelephone(): string | null {
  if (!estRenseigne(site.telephone)) return null;
  const chiffres = site.telephone.replace(/[^\d+]/g, "");
  const international = chiffres.startsWith("0") ? `+33${chiffres.slice(1)}` : chiffres;
  return `tel:${international}`;
}

/** Lien WhatsApp, avec un message prérempli facultatif. `null` si non renseigné. */
export function lienWhatsApp(message?: string): string | null {
  if (!estRenseigne(site.whatsapp)) return null;
  const numero = site.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${numero}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/** Lien WhatsApp du client vers nous, pour envoyer ses photos avec sa référence. `null` si non renseigné. */
export function lienWhatsAppPhotos(reference: string): string | null {
  return lienWhatsApp(`Bonjour ${site.nom}, voici les photos de ma demande ${reference}.`);
}

/** Lien `mailto:`, ou `null` si l'adresse n'est pas renseignée. */
export function lienEmail(): string | null {
  return estRenseigne(site.email) ? `mailto:${site.email}` : null;
}

/** Nos coordonnées en une phrase, pour les messages d'erreur : jamais une demande sans issue. */
export function phraseContacts(): string {
  const whatsapp = estRenseigne(site.whatsapp)
    ? formaterTelephone(`+${site.whatsapp.replace(/\D/g, "")}`)
    : ouACompleter(site.whatsapp, "numéro WhatsApp");
  return `Appelez-nous (${ouACompleter(site.telephone, "téléphone")}) ou écrivez-nous sur WhatsApp (${whatsapp}).`;
}
