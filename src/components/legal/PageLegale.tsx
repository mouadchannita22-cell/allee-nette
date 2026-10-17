import type { ReactNode } from "react";
import { RELECTURE_JURIDIQUE } from "@/data/legal";
import { formaterDateIso } from "@/lib/date-paris";
import { EnTetePage } from "@/components/sections/EnTetes";
import { AConfirmer } from "@/components/ui/ACompleter";

/**
 * Mise en page commune des pages légales : en-tête sombre (seul h1 de la
 * page), date de dernière mise à jour fixée dans data/legal.ts, puis le texte
 * MDX sur fond clair, en largeur de lecture. Avec un sommaire, celui-ci
 * précède le texte sur mobile et reste à gauche sur grand écran.
 */
export function PageLegale({
  surtitre,
  titre,
  intro,
  miseAJour,
  sommaire,
  children,
}: {
  surtitre: string;
  titre: string;
  intro: string;
  /** Date de dernière mise à jour du texte, AAAA-MM-JJ (data/legal.ts). */
  miseAJour: string;
  sommaire?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <EnTetePage
        surtitre={surtitre}
        titre={titre}
        intro={
          <>
            <p>{intro}</p>
            <p className="mt-4 text-base">
              Dernière mise à jour : <time dateTime={miseAJour}>{formaterDateIso(miseAJour)}</time>
            </p>
          </>
        }
      />

      <section aria-label={titre} className="theme-clair py-14 md:py-20">
        <div className="conteneur">
          <div className={sommaire ? "lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16" : ""}>
            {sommaire && (
              <div className="mb-12 lg:sticky lg:top-28 lg:mb-0 lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto lg:pb-4">
                {sommaire}
              </div>
            )}
            <article className="min-w-0 max-w-[68ch]">
              {!RELECTURE_JURIDIQUE.faite && (
                <p className="mb-10 text-sm">
                  <AConfirmer libelle={RELECTURE_JURIDIQUE.libelle} />
                </p>
              )}
              {children}
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
