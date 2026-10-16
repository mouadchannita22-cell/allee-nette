import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { liensInfos, liensLegaux, prestations } from "@/config/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const chemins = new Set<string>([
    "/",
    "/reserver",
    ...prestations.map((l) => l.href),
    ...liensInfos.map((l) => l.href),
    ...liensLegaux.map((l) => l.href),
  ]);
  return [...chemins].map((chemin) => ({
    url: `${site.url}${chemin === "/" ? "" : chemin}`,
    changeFrequency: chemin === "/" || chemin === "/tarifs" ? "weekly" : "monthly",
    priority: chemin === "/" ? 1 : chemin === "/tarifs" || chemin === "/reserver" ? 0.9 : 0.6,
  }));
}
