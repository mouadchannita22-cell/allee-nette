import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.nom} — nettoyage auto à domicile`,
    short_name: site.nom,
    description: site.promesse,
    start_url: "/",
    display: "standalone",
    background_color: "#0B1220",
    theme_color: "#0B1220",
    lang: "fr",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
