import { site } from "@/config/site";
import { configurationUmami } from "@/lib/umami";
import { ScriptUmami } from "./ScriptUmami";

/**
 * Mesure d'audience sans cookie (Umami), montée une fois dans le layout.
 *
 * Rien n'est rendu, ni aucun JavaScript envoyé au navigateur, tant que
 * NEXT_PUBLIC_UMAMI_WEBSITE_ID n'est pas défini (au build). Les variables
 * NEXT_PUBLIC_ sont inscrites dans le code compilé : changer leur valeur
 * impose un nouveau build. Mode d'emploi : docs/mesure-audience.md.
 */
export function MesureAudience() {
  const configuration = configurationUmami(
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    process.env.NEXT_PUBLIC_UMAMI_SRC,
    site.url,
  );
  if (!configuration) return null;
  return <ScriptUmami {...configuration} />;
}
