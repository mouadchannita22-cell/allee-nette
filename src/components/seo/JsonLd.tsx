import { versJsonLd } from "@/lib/donnees-structurees";

/** Balise <script type="application/ld+json"> (données structurées pour les moteurs). */
export function JsonLd({ donnees }: { donnees: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: versJsonLd(donnees) }} />;
}
