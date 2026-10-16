import { estRenseigne, site } from "@/config/site";

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

/** Lien `mailto:`, ou `null` si l'adresse n'est pas renseignée. */
export function lienEmail(): string | null {
  return estRenseigne(site.email) ? `mailto:${site.email}` : null;
}
