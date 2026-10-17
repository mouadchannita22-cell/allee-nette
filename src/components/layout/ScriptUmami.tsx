"use client";

import { useEffect } from "react";
import { evenementDuLien, suivre, viderFileAttente } from "@/lib/analytics";
import { NOM_FILTRE_UMAMI, preparerEnvoiUmami, type ConfigurationUmami } from "@/lib/umami";

declare global {
  interface Window {
    [NOM_FILTRE_UMAMI]?: (type: string, charge: unknown) => unknown;
  }
}

/**
 * Script Umami et écoute des clics vers le téléphone et WhatsApp. Ne rend
 * rien : tout se passe après l'hydratation.
 *
 * - Le script est ajouté après l'événement `load` de la page, quand le
 *   navigateur est au repos : il ne retarde ni l'affichage (LCP) ni le
 *   JavaScript du site, et n'est jamais préchargé. Pas de `next/script` :
 *   ce chargeur de quelques lignes suffit et n'alourdit pas le JavaScript
 *   commun à toutes les pages.
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
export function ScriptUmami(configuration: ConfigurationUmami) {
  // Variable inscrite au build : sans identifiant, le reste de ce fichier
  // disparaît du JavaScript envoyé au navigateur (code jamais atteint).
  return process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ? <ChargeurUmami {...configuration} /> : null;
}

function ChargeurUmami({ idSite, src, domaine }: ConfigurationUmami) {
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

    let actif = true;
    let repos: number | null = null;
    const charger = () => {
      if (!actif || document.querySelector("script[data-website-id]")) return;
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      Object.assign(script.dataset, {
        websiteId: idSite,
        domains: domaine,
        excludeSearch: "true",
        excludeHash: "true",
        beforeSend: NOM_FILTRE_UMAMI,
      });
      script.addEventListener("load", viderFileAttente);
      document.head.appendChild(script);
    };
    const auRepos = () => {
      repos = "requestIdleCallback" in window ? window.requestIdleCallback(charger, { timeout: 5000 }) : null;
      if (repos === null) window.setTimeout(charger, 200);
    };
    if (document.readyState === "complete") auRepos();
    else window.addEventListener("load", auRepos, { once: true });

    return () => {
      actif = false;
      window.removeEventListener("load", auRepos);
      if (repos !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(repos);
      document.removeEventListener("click", surClic, { capture: true });
      document.removeEventListener("auxclick", surClic, { capture: true });
    };
  }, [idSite, src, domaine]);

  return null;
}
