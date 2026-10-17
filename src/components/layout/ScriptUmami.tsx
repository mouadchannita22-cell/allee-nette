"use client";

import Script from "next/script";
import { useEffect } from "react";
import { evenementDuLien, suivre, viderFileAttente } from "@/lib/analytics";
import { NOM_FILTRE_UMAMI, preparerEnvoiUmami, type ConfigurationUmami } from "@/lib/umami";

declare global {
  interface Window {
    [NOM_FILTRE_UMAMI]?: (type: string, charge: unknown) => unknown;
  }
}

/**
 * Script Umami et écoute des clics vers le téléphone et WhatsApp.
 *
 * - `lazyOnload` : le script est demandé après l'événement `load` de la page,
 *   quand le navigateur est au repos. Il ne retarde ni l'affichage (LCP) ni
 *   le JavaScript du site, et n'est pas préchargé.
 * - `data-domains` : seul le domaine de NEXT_PUBLIC_SITE_URL est compté
 *   (pas les aperçus Netlify ni le local).
 * - `data-exclude-search` et `data-exclude-hash` : l'adresse envoyée perd ses
 *   paramètres (référence, lien de paiement signé…). Le filtre
 *   `data-before-send` (lib/umami.ts) y remet seulement les paramètres UTM
 *   et ignore l'administration ; si une version d'Umami ne le prenait pas en
 *   charge, l'adresse resterait simplement sans paramètres.
 * - Une seule écoute des clics, sur tout le document : chaque lien `tel:` ou
 *   WhatsApp du site émet `clic_telephone` ou `clic_whatsapp`, sans qu'aucun
 *   composant n'ait à s'en charger (et donc jamais deux fois).
 */
export function ScriptUmami({ idSite, src, domaine }: ConfigurationUmami) {
  useEffect(() => {
    window[NOM_FILTRE_UMAMI] = (_type, charge) => preparerEnvoiUmami(charge, window.location.href);

    const surClic = (e: MouseEvent) => {
      if (e.type === "auxclick" && e.button !== 1) return;
      const lien = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!lien || window.location.pathname.startsWith("/admin")) return;
      const nom = evenementDuLien(lien.getAttribute("href"));
      if (nom) suivre(nom);
    };
    document.addEventListener("click", surClic, { capture: true });
    document.addEventListener("auxclick", surClic, { capture: true });
    return () => {
      document.removeEventListener("click", surClic, { capture: true });
      document.removeEventListener("auxclick", surClic, { capture: true });
    };
  }, []);

  return (
    <Script
      src={src}
      strategy="lazyOnload"
      data-website-id={idSite}
      data-domains={domaine}
      data-exclude-search="true"
      data-exclude-hash="true"
      data-before-send={NOM_FILTRE_UMAMI}
      onLoad={viderFileAttente}
    />
  );
}
