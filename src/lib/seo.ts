import type { Metadata } from "next";
import { site, zoneActive } from "@/config/site";
import { prixMinimum } from "@/data/offres";

const [commune1, commune2, commune3] = zoneActive.communesPrincipales;

export const descriptionAccueil = `On vient chez vous nettoyer votre voiture, intérieur et extérieur sans rinçage. Prix fermes dès ${prixMinimum()} €, retouche gratuite sous 24 h. Réservez en 2 minutes.`;

/** Vrai pour le site public. Faux en local et sur les aperçus Netlify. */
const contexteProduction = process.env.CONTEXT
  ? process.env.CONTEXT === "production"
  : process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Indexation par les moteurs de recherche : seulement en production ET quand
 * la variable INDEXATION vaut « oui » (à poser sur Netlify le jour du
 * lancement, puis redéployer). Avant, le site en ligne reste en noindex :
 * Google ne référence pas une version qui contient encore des [À COMPLÉTER].
 */
export const estProduction = contexteProduction && process.env.INDEXATION === "oui";

export const titreAccueil = `Nettoyage auto à domicile à ${commune1}, ${commune2}, ${commune3} | ${site.nom}`;

type Options = {
  /** Titre de la page, complété par « | Allée Nette ». */
  titre: string;
  description: string;
  /** Chemin canonique, par exemple « /tarifs ». */
  chemin: string;
  indexer?: boolean;
};

/** Métadonnées d'une page : titre, description, URL canonique et Open Graph. */
export function metadonnees({ titre, description, chemin, indexer = true }: Options): Metadata {
  return {
    title: titre,
    description,
    alternates: { canonical: chemin },
    openGraph: { title: `${titre} | ${site.nom}`, description, url: chemin },
    ...(indexer ? {} : { robots: { index: false, follow: false } }),
  };
}
