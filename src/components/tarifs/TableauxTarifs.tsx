import type { ReactNode } from "react";
import { site, zoneActive } from "@/config/site";
import {
  ABONNEMENTS,
  AVANTAGES_ABONNEMENT,
  CODES_GABARIT,
  DEPLACEMENT,
  FORMULES,
  GABARITS,
  OFFRES,
  OPTIONS,
  REMISE_ABONNEMENT_POURCENT,
  duree,
  formule,
  prixAbonnement,
  type OptionTarif,
} from "@/data/offres";
import { euros } from "@/lib/texte";
import { MentionPrix } from "@/components/sections/MentionPrix";

function Tableau({ titre, id, children, note }: { titre: string; id: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-16 first:mt-0">
      <h3 id={id} className="font-sans text-2xl font-bold tracking-normal">
        {titre}
      </h3>
      <div className="mt-5 overflow-x-auto rounded-carte border border-bord bg-blanc shadow-douce">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">{children}</table>
      </div>
      <div className="mt-3 space-y-1">
        {note}
        <MentionPrix />
      </div>
    </section>
  );
}

const th = "px-5 py-3.5 font-semibold text-doux";
const td = "border-t border-bord px-5 py-4 align-top";

function prixOption(o: OptionTarif): string {
  if (typeof o.prix !== "number") return `+${o.prix.min} à +${o.prix.max} €`;
  if (o.unite) return `+${o.prix} € par ${o.unite.singulier}`;
  return o.id === "exterieur-seul" ? `${o.prix} €` : `+${o.prix} €`;
}

/** Grille complète : formules, options, déplacement, abonnements et offres. */
export function TableauxTarifs() {
  const offres = [
    OFFRES.lancement.actif &&
      OFFRES.lancement.placesRestantes > 0 && {
        nom: `${OFFRES.lancement.nom} : ${OFFRES.lancement.placesTotal} premiers clients`,
        texte: `${OFFRES.lancement.avantages.join(", ")} sur ${OFFRES.lancement.desodorisationOfferteSur
          .map((id) => formule(id).nom)
          .join(" et ")}. Places restantes : ${OFFRES.lancement.placesRestantes} sur ${OFFRES.lancement.placesTotal}.`,
      },
    OFFRES.garage.actif && { nom: `Code ${OFFRES.garage.code}`, texte: `${OFFRES.garage.nom} : ${OFFRES.garage.description}.` },
    OFFRES.parrainage.actif && { nom: OFFRES.parrainage.nom, texte: `${OFFRES.parrainage.description}.` },
    OFFRES.rueGroupee.actif && { nom: `${OFFRES.rueGroupee.nom} (code ${OFFRES.rueGroupee.code})`, texte: `${OFFRES.rueGroupee.description}.` },
    OFFRES.deuxVoitures.actif && { nom: OFFRES.deuxVoitures.nom, texte: `${OFFRES.deuxVoitures.description}.` },
    OFFRES.professionnels.actif && { nom: OFFRES.professionnels.nom, texte: `${OFFRES.professionnels.description}.` },
    OFFRES.bonCadeau.actif && {
      nom: OFFRES.bonCadeau.nom,
      texte: `${OFFRES.bonCadeau.description}.${site.pages.bonsCadeaux ? "" : " Achat en ligne bientôt : en attendant, écrivez-nous."}`,
    },
  ].filter((o): o is { nom: string; texte: string } => Boolean(o));

  return (
    <div>
      <Tableau titre="Formules, par gabarit" id="tableau-formules">
        <caption className="sr-only">Prix des formules selon le gabarit du véhicule</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Formule
            </th>
            {GABARITS.map((g) => (
              <th key={g.code} scope="col" className={`${th} text-right`}>
                <span className="font-titre text-texte">{g.code}</span>{" "}
                <span className="font-normal">{g.libelleCourt}</span>
              </th>
            ))}
            <th scope="col" className={th}>
              Sur place
            </th>
          </tr>
        </thead>
        <tbody>
          {FORMULES.map((f) => (
            <tr key={f.id}>
              <th scope="row" className={`${td} font-semibold`}>
                {f.nom}
                <span className="block text-xs font-normal text-doux">{f.positionnement}</span>
              </th>
              {CODES_GABARIT.map((g) => (
                <td key={g} className={`${td} text-right font-titre text-base font-bold tabular-nums`}>
                  {euros(f.prix[g])}
                </td>
              ))}
              <td className={`${td} text-doux`}>
                {duree(f)}
                {f.sechage ? `, ${f.sechage}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </Tableau>

      <Tableau titre="Options et suppléments" id="tableau-options">
        <caption className="sr-only">Prix et règles des options</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Option
            </th>
            <th scope="col" className={`${th} text-right`}>
              Prix
            </th>
            <th scope="col" className={th}>
              Règle
            </th>
          </tr>
        </thead>
        <tbody>
          {OPTIONS.map((o) => (
            <tr key={o.id}>
              <th scope="row" className={`${td} font-semibold`}>
                {o.libelle}
              </th>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>{prixOption(o)}</td>
              <td className={`${td} text-doux`}>{o.regle}</td>
            </tr>
          ))}
        </tbody>
      </Tableau>

      <Tableau
        titre="Déplacement"
        id="tableau-deplacement"
        note={
          <p className="text-xs text-doux">
            Distances depuis {zoneActive.ville}. La zone se détermine par votre commune : voyez la page Zones.
          </p>
        }
      >
        <caption className="sr-only">Supplément de déplacement selon la zone</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Zone
            </th>
            <th scope="col" className={th}>
              Distance
            </th>
            <th scope="col" className={`${th} text-right`}>
              Supplément
            </th>
            <th scope="col" className={th}>
              Règle
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={`${td} font-semibold`}>
              {DEPLACEMENT.zone1.libelle}
            </th>
            <td className={td}>Jusqu'à {zoneActive.rayons.zone1} km</td>
            <td className={`${td} text-right font-bold`}>Inclus</td>
            <td className={`${td} text-doux`}>Commande minimale {DEPLACEMENT.zone1.commandeMinimale} €</td>
          </tr>
          <tr>
            <th scope="row" className={`${td} font-semibold`}>
              {DEPLACEMENT.zone2.libelle}
            </th>
            <td className={td}>
              De {zoneActive.rayons.zone1} à {zoneActive.rayons.zone2} km
            </td>
            <td className={`${td} text-right font-bold tabular-nums`}>+{DEPLACEMENT.zone2.supplement} €</td>
            <td className={`${td} text-doux`}>
              {DEPLACEMENT.zone2.formulesMinimales.map((id) => formule(id).nomCourt).join(", ")} au minimum
            </td>
          </tr>
          <tr>
            <th scope="row" className={`${td} font-semibold`}>
              {DEPLACEMENT.horsZone.libelle}
            </th>
            <td className={td}>Au-delà de {zoneActive.rayons.zone2} km</td>
            <td className={`${td} text-right font-bold`}>Sur demande</td>
            <td className={`${td} text-doux`}>{DEPLACEMENT.horsZone.vehiculesMinimum} véhicules minimum</td>
          </tr>
        </tbody>
      </Tableau>

      <Tableau
        titre="Abonnements"
        id="tableau-abonnements"
        note={
          <p className="text-xs text-doux">
            −{REMISE_ABONNEMENT_POURCENT} % sur la formule, arrondi à l'euro inférieur. {AVANTAGES_ABONNEMENT.join(", ")}.
          </p>
        }
      >
        <caption className="sr-only">Prix des abonnements selon le gabarit</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Abonnement
            </th>
            {GABARITS.map((g) => (
              <th key={g.code} scope="col" className={`${th} text-right`}>
                <span className="font-titre text-texte">{g.code}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ABONNEMENTS.map((a) => (
            <tr key={a.id}>
              <th scope="row" className={`${td} font-semibold`}>
                {formule(a.formule).nom} {a.frequence}
              </th>
              {CODES_GABARIT.map((g) => (
                <td key={g} className={`${td} text-right font-titre text-base font-bold tabular-nums`}>
                  {euros(prixAbonnement(a.formule, g))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Tableau>

      <section aria-labelledby="titre-offres" className="mt-16">
        <h3 id="titre-offres" className="font-sans text-2xl font-bold tracking-normal">
          Offres en cours
        </h3>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {offres.map((o) => (
            <li key={o.nom} className="rounded-carte border border-bord bg-blanc p-5 shadow-douce">
              <p className="font-semibold">{o.nom}</p>
              <p className="mt-1 text-sm text-doux">{o.texte}</p>
            </li>
          ))}
        </ul>
        <MentionPrix className="mt-3" />
      </section>
    </div>
  );
}
