import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { estProduction } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!estProduction) {
    // Aperçus et développement : rien n'est indexé.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/paiement"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
