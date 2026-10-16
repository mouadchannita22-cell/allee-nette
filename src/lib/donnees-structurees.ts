/**
 * Données structurées JSON-LD, générées depuis la configuration et les offres.
 * Pas d'adresse de rue (entreprise qui se déplace), aucune note agrégée d'avis.
 */
import { communesDesservies, estRenseigne, site, zoneActive } from "@/config/site";
import { FAQ } from "@/content/faq";
import { FORMULES, GABARITS, prixMaximum, prixMinimum } from "@/data/offres";
import { descriptionAccueil } from "./seo";

type Objet = Record<string, unknown>;

/** Sérialise sans risque d'injection (le caractère « < » est échappé). */
export function versJsonLd(donnees: Objet): string {
  return JSON.stringify(donnees).replace(/</g, "\\u003c");
}

function telephoneInternational(): string | undefined {
  if (!estRenseigne(site.telephone)) return undefined;
  const chiffres = site.telephone.replace(/[^\d+]/g, "");
  return chiffres.startsWith("0") ? `+33${chiffres.slice(1)}` : chiffres;
}

export function donneesEntreprise(): Objet {
  const sameAs = [site.reseaux.ficheGoogle, site.reseaux.instagram].filter(estRenseigne);
  return {
    "@context": "https://schema.org",
    "@type": "AutoWash",
    "@id": `${site.url}/#entreprise`,
    name: site.nom,
    slogan: site.promesse,
    description: descriptionAccueil,
    url: site.url,
    logo: `${site.url}/icones/icone-512.png`,
    image: `${site.url}/opengraph-image`,
    ...(telephoneInternational() ? { telephone: telephoneInternational() } : {}),
    ...(estRenseigne(site.email) ? { email: site.email } : {}),
    address: { "@type": "PostalAddress", addressLocality: zoneActive.ville, addressCountry: "FR" },
    areaServed: communesDesservies().map((c) => ({ "@type": "City", name: c.nom, postalCode: c.cp })),
    priceRange: `${prixMinimum()} € – ${prixMaximum()} €`,
    paymentAccepted: "Carte bancaire, Apple Pay, Google Pay, PayPal, Espèces",
    currenciesAccepted: "EUR",
    ...(sameAs.length ? { sameAs } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Formules de nettoyage automobile à domicile",
      itemListElement: FORMULES.map((f) => ({
        "@type": "OfferCatalog",
        name: f.nom,
        itemListElement: GABARITS.map((g) => ({
          "@type": "Offer",
          name: `${f.nom}, ${g.libelleCourt}`,
          price: f.prix[g.code],
          priceCurrency: "EUR",
          itemOffered: { "@type": "Service", name: f.nom, description: f.pourQui },
        })),
      })),
    },
  };
}

export function donneesFaq(): Objet {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.filter((q) => !q.aConfirmer).map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.reponse },
    })),
  };
}
