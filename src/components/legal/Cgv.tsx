import { communesDesservies, site, zoneActive, type Encaisseur } from "@/config/site";
import { EMPLACEMENTS } from "@/data/conditions";
import { ANNEXE_CGV, ARTICLES_CGV, type IdArticleCgv } from "@/data/legal";
import { DEPLACEMENT, FORMULES, GABARITS, GARANTIE, OPTIONS, formule, option, type OptionId, type OptionTarif } from "@/data/offres";
import { DETAILS_PAIEMENT_SUR_PLACE } from "@/data/paiement";
import { MODES_PAIEMENT, PHOTOS_DEMANDEES, TEXTE_EXECUTION_ANTICIPEE } from "@/data/reservation";
import { euros } from "@/lib/texte";
import { fr } from "@/lib/typo";
import { ACompleter, AConfirmer } from "@/components/ui/ACompleter";
import { CLASSES_TEXTE } from "./classes";
import { Email, NomAssocie } from "./Valeurs";

/**
 * Composants des conditions générales de vente (src/content/cgv.mdx) :
 * titres numérotés, sommaire, et textes tirés des données (prix, zones,
 * garantie, paiement, rétractation). Changer une valeur dans data/*.ts ou
 * config/site.ts la change dans les CGV.
 */

const LETTRES: readonly Encaisseur[] = ["A", "B"];

/** Première lettre en minuscule, pour reprendre un libellé dans une phrase. */
function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

const SURTITRE = "block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-accent";

// ---------------------------------------------------------------------------
// Titres et sommaire
// ---------------------------------------------------------------------------

/** Titre d'un article, numéroté selon son rang dans ARTICLES_CGV (data/legal.ts). */
export function Article({ id }: { id: IdArticleCgv }) {
  const rang = ARTICLES_CGV.findIndex((a) => a.id === id);
  const article = ARTICLES_CGV[rang];
  if (!article) throw new Error(`Article des CGV inconnu : ${id}`);
  return (
    <h2 id={id} className={CLASSES_TEXTE.h2}>
      <span className={SURTITRE}>Article {rang + 1}</span> {fr(article.titre)}
    </h2>
  );
}

/** Titre de l'annexe (formulaire type de rétractation). */
export function Annexe() {
  return (
    <h2 id={ANNEXE_CGV.id} className={CLASSES_TEXTE.h2}>
      <span className={SURTITRE}>Annexe</span> {ANNEXE_CGV.titre}
    </h2>
  );
}

/** Sommaire des CGV, avec un lien vers chaque article et l'annexe. */
export function SommaireCgv() {
  const lien = "underline decoration-bord-champ underline-offset-4 hover:text-accent hover:decoration-accent";
  return (
    <nav aria-labelledby="titre-sommaire" className="rounded-carte border border-bord-champ bg-blanc p-5">
      <h2 id="titre-sommaire" className="font-sans text-base font-bold tracking-normal">
        Sommaire
      </h2>
      <ol className="mt-3 space-y-2 text-sm">
        {ARTICLES_CGV.map((a, i) => (
          <li key={a.id} className="flex gap-2">
            <span className="w-5 shrink-0 text-right tabular-nums text-doux">{i + 1}.</span>
            <a href={`#${a.id}`} className={lien}>
              {fr(a.titre)}
            </a>
          </li>
        ))}
        <li className="flex gap-2 border-t border-bord pt-2">
          <a href={`#${ANNEXE_CGV.id}`} className={lien}>
            Annexe : {minuscule(ANNEXE_CGV.titre)}
          </a>
        </li>
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Prix (data/offres.ts)
// ---------------------------------------------------------------------------

/** Grille des formules par gabarit, prix TTC. */
export function TableauPrix() {
  const th = "px-3 py-2.5 text-left align-bottom font-semibold sm:px-4";
  const td = "border-t border-bord px-3 py-2.5 align-top sm:px-4";
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-bord bg-blanc">
      <table className="w-full text-sm">
        <caption className="px-3 pt-3 text-left text-doux sm:px-4">Prix par gabarit de véhicule, en euros TTC</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Formule
            </th>
            {GABARITS.map((g) => (
              <th key={g.code} scope="col" className={`${th} text-right`}>
                {g.code}
                <span className="block text-xs font-normal text-doux">{g.libelleCourt}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FORMULES.map((f) => (
            <tr key={f.id}>
              <th scope="row" className={`${td} text-left font-semibold`}>
                {f.nom}
              </th>
              {GABARITS.map((g) => (
                <td key={g.code} className={`${td} whitespace-nowrap text-right tabular-nums`}>
                  {euros(f.prix[g.code])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** « 25 € », « 15 € par siège », « de 25 à 45 € ». */
export function prixOption(o: OptionTarif): string {
  if (typeof o.prix !== "number") return `de ${euros(o.prix.min)} à ${euros(o.prix.max)}`;
  if (o.unite) return `${euros(o.prix)} par ${o.unite.singulier}`;
  return euros(o.prix);
}

/** Prix d'une option, en ligne : `<PrixOption id="tres-sale" />`. */
export function PrixOption({ id }: { id: OptionId }) {
  return <>{prixOption(option(id))}</>;
}

/** Options et suppléments, avec leur prix et leur règle. */
export function ListeOptions() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {OPTIONS.map((o) => (
        <li key={o.id} className={CLASSES_TEXTE.li}>
          {o.libelle} : <strong className="font-semibold">{prixOption(o)}</strong>
          <span className="text-doux"> ({fr(minuscule(o.regle))})</span>
        </li>
      ))}
    </ul>
  );
}

/** Formules qui demandent un temps de séchage, avec la précaution à prendre (paragraphe). */
export function Sechage() {
  const concernees = FORMULES.filter((f) => f.aSavoir);
  const aSavoir = concernees[0]?.aSavoir;
  if (!aSavoir) return null;
  const noms = concernees.map((f) => f.nomCourt).join(" et ");
  return <p className={CLASSES_TEXTE.p}>{fr(`Après ${noms}, ${minuscule(aSavoir)}`)}</p>;
}

/** Photos demandées à la réservation : « habitacle avant, habitacle arrière, extérieur ». */
export function PhotosDemandees() {
  return <>{PHOTOS_DEMANDEES.map((p) => minuscule(p.libelle)).join(", ")}</>;
}

// ---------------------------------------------------------------------------
// Intervention et zones (data/conditions.ts, config/site.ts)
// ---------------------------------------------------------------------------

/** Emplacements où nous intervenons. */
export function Emplacements() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {EMPLACEMENTS.map((e) => (
        <li key={e} className={CLASSES_TEXTE.li}>
          {e.replace(/^Votre /, "votre ")}
        </li>
      ))}
    </ul>
  );
}

/** Zones, distances et règles de déplacement de la zone active. */
export function Zones() {
  const { ville, rayons, zone1, zone2 } = zoneActive;
  const minimales = DEPLACEMENT.zone2.formulesMinimales.map((id) => formule(id).nomCourt).join(", ");
  return (
    <ul className={CLASSES_TEXTE.ul}>
      <li className={CLASSES_TEXTE.li}>
        {fr(
          `Zone 1, jusqu'à ${rayons.zone1} km de ${ville} (${zone1.length} communes) : déplacement inclus, commande minimale de ${euros(DEPLACEMENT.zone1.commandeMinimale)}.`,
        )}
      </li>
      <li className={CLASSES_TEXTE.li}>
        {fr(
          `Zone 2, de ${rayons.zone1} à ${rayons.zone2} km (${zone2.length} communes) : supplément de déplacement de ${euros(DEPLACEMENT.zone2.supplement)} par rendez-vous, avec au moins une de ces formules : ${minimales}.`,
        )}
      </li>
      <li className={CLASSES_TEXTE.li}>
        {fr(`Au-delà : sur demande, à partir de ${DEPLACEMENT.horsZone.vehiculesMinimum} véhicules.`)}
      </li>
    </ul>
  );
}

/** Nombre total de communes desservies. */
export function NombreCommunes() {
  return <>{communesDesservies().length}</>;
}

// ---------------------------------------------------------------------------
// Réservation, paiement, rétractation
// ---------------------------------------------------------------------------

/** Règle de report et d'annulation (site.annulation), marquée tant qu'elle n'est pas confirmée. */
export function Annulation() {
  return (
    <>
      {fr(site.annulation.texte)}
      {!site.annulation.confirmee && (
        <>
          {" "}
          <AConfirmer libelle="règle de report et d'annulation" />
        </>
      )}
    </>
  );
}

/** Moyens de paiement, en ligne et sur place (data/reservation.ts et data/paiement.ts). */
export function MoyensPaiement() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {MODES_PAIEMENT.map((mode) => (
        <li key={mode.id} className={CLASSES_TEXTE.li}>
          <strong className="font-semibold">{mode.libelle}</strong> :{" "}
          {mode.id === "sur-place"
            ? mode.moyens.map((m) => minuscule(DETAILS_PAIEMENT_SUR_PLACE[m as keyof typeof DETAILS_PAIEMENT_SUR_PLACE])).join(" ; ")
            : mode.moyens.join(", ")}
          .
        </li>
      ))}
    </ul>
  );
}

/** Texte de la case d'exécution anticipée, cité mot pour mot depuis la réservation. */
export function TexteExecutionAnticipee() {
  return (
    <blockquote className={CLASSES_TEXTE.citation}>
      <p>« {TEXTE_EXECUTION_ANTICIPEE} »</p>
    </blockquote>
  );
}

/** À qui adresser une rétractation : l'entrepreneur qui réalise la prestation. */
export function DestinatairesRetractation() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {LETTRES.map((lettre) => {
        const a = site.associes[lettre];
        return (
          <li key={lettre} className={CLASSES_TEXTE.li}>
            <NomAssocie lettre={lettre} />, <ACompleter valeur={a.adresse} libelle={`adresse de l'associé ${lettre}`} />,{" "}
            <Email adresse={a.email} libelle={`e-mail de l'associé ${lettre}`} />
          </li>
        );
      })}
    </ul>
  );
}

/** Garantie Retouche : promesse, limites et exclusions (GARANTIE, data/offres.ts). */
export function Garantie() {
  return (
    <>
      <p className={CLASSES_TEXTE.p}>{fr(GARANTIE.texte)}</p>
      <p className={CLASSES_TEXTE.p}>Ses limites :</p>
      <ul className={CLASSES_TEXTE.ul}>
        {GARANTIE.limites.map((l) => (
          <li key={l} className={CLASSES_TEXTE.li}>
            {fr(l)} ;
          </li>
        ))}
      </ul>
      <p className={CLASSES_TEXTE.p}>Elle ne couvre pas :</p>
      <ul className={CLASSES_TEXTE.ul}>
        {GARANTIE.exclusions.map((e) => (
          <li key={e} className={CLASSES_TEXTE.li}>
            {fr(minuscule(e))} ;
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------
// Annexe : formulaire type de rétractation
// ---------------------------------------------------------------------------

function Champ({ libelle }: { libelle: string }) {
  return (
    <p className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
      <span>{libelle}</span>
      <span aria-hidden="true" className="h-5 min-w-32 flex-1 border-b border-dotted border-texte/60" />
    </p>
  );
}

/**
 * Formulaire type de rétractation (modèle du Code de la consommation), pour
 * une prestation de services. À imprimer, ou à recopier dans un e-mail.
 */
export function FormulaireRetractation() {
  return (
    <div className={CLASSES_TEXTE.encadre}>
      <p className="font-titre text-lg font-bold">Formulaire de rétractation</p>
      <p className="mt-2 text-sm text-doux">
        (Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)
      </p>
      <p className="mt-4">
        À l&apos;attention de l&apos;entrepreneur qui réalise votre prestation (son nom figure sur la confirmation et sur
        la facture) :
      </p>
      <DestinatairesRetractation />
      <p className="mt-4">
        Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la
        prestation de services ci-dessous :
      </p>
      <Champ libelle="Prestation :" />
      <Champ libelle="Commandé le :" />
      <Champ libelle="Nom du (des) consommateur(s) :" />
      <Champ libelle="Adresse du (des) consommateur(s) :" />
      <Champ libelle="Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :" />
      <Champ libelle="Date :" />
      <p className="mt-4 text-sm text-doux">(*) Rayez la mention inutile.</p>
    </div>
  );
}
