import Link from "next/link";
import { lienFormule } from "@/config/navigation";
import { FORMULES, duree } from "@/data/offres";
import { IconeFleche } from "@/components/ui/Icones";
import { EnTeteSection } from "./EnTetes";
import { MentionPrix } from "./MentionPrix";

/** Les quatre formules avec leur prix « dès », qui renvoient vers la grille complète. */
export function FormulesApercu() {
  return (
    <section className="theme-sombre py-24 md:py-32" aria-labelledby="titre-formules">
      <div className="conteneur">
        <EnTeteSection
          id="titre-formules"
          surtitre="Nos formules"
          titre="Des prix fermes, par gabarit."
          intro="Citadine, compacte ou grand SUV : chaque formule a son prix, annoncé avant. Il est confirmé sur vos photos, puis il ne bouge plus."
        />
        <ul className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {FORMULES.map((f) => {
            const principale = f.id === "complet";
            return (
              <li
                key={f.id}
                data-inclinaison
                className={`flex flex-col rounded-carte border p-6 ${
                  principale ? "border-aqua/50 bg-aqua/[0.07] shadow-eclat" : "border-bord bg-texte/[0.03]"
                }`}
              >
                <p className="text-sm font-semibold text-accent">{f.positionnement}</p>
                <h3 className="mt-2 font-sans text-xl font-bold tracking-normal">{f.nom}</h3>
                <p className="mt-4">
                  <Link href="/tarifs#grille" className="group inline-flex items-baseline gap-1.5">
                    <span className="text-sm text-doux">dès</span>
                    <span className="font-titre text-4xl font-extrabold tabular-nums">{f.prix.S} €</span>
                    <span className="sr-only">, voir la grille complète des prix</span>
                  </Link>
                </p>
                <p className="mt-1 text-sm text-doux">
                  {duree(f)}
                  {f.sechage ? `, ${f.sechage}` : ""}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {f.inclus.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-aqua" />
                      {i}
                    </li>
                  ))}
                </ul>
                <Link
                  href={lienFormule(f)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                >
                  Voir le détail <span className="sr-only">de {f.nom}</span>
                  <IconeFleche className="size-4" />
                </Link>
              </li>
            );
          })}
        </ul>
        <MentionPrix className="mt-6" />
      </div>
    </section>
  );
}
