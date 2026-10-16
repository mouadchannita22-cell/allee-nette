import type { ReactNode } from "react";
import { frSiTexte } from "@/lib/typo";

/** Surtitre en petites capitales, couleur d'accent. */
export function Surtitre({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{children}</p>;
}

/** En-tête de section : surtitre, titre h2, introduction. */
export function EnTeteSection({
  id,
  surtitre,
  titre,
  intro,
  centre = false,
}: {
  id?: string;
  surtitre?: string;
  titre: ReactNode;
  intro?: ReactNode;
  centre?: boolean;
}) {
  return (
    <div className={`max-w-3xl ${centre ? "mx-auto text-center" : ""}`}>
      {surtitre && <Surtitre>{surtitre}</Surtitre>}
      <h2 id={id} className="mt-3 text-3xl font-bold leading-[1.08] md:text-5xl">
        {frSiTexte(titre)}
      </h2>
      {intro && <p className="mt-5 text-lg text-doux">{frSiTexte(intro)}</p>}
    </div>
  );
}

/** En-tête des pages intérieures (fond sombre, sous la navigation). */
export function EnTetePage({
  surtitre,
  titre,
  intro,
  children,
}: {
  surtitre: string;
  titre: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="theme-sombre relative isolate overflow-hidden pb-16 pt-36 md:pb-20 md:pt-44">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
      />
      <div className="conteneur">
        <Surtitre>{surtitre}</Surtitre>
        <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.02] md:text-6xl">{frSiTexte(titre)}</h1>
        {intro && <div className="mt-6 max-w-2xl text-lg text-doux">{frSiTexte(intro)}</div>}
        {children && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>}
      </div>
    </section>
  );
}
