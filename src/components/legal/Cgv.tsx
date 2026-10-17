import { site, zoneActive } from "@/config/site";
import { EMPLACEMENTS, PAIEMENT_SUR_PLACE } from "@/data/conditions";
import { ANNEXE_CGV, ARTICLES_CGV, type IdArticleCgv } from "@/data/legal";
import { DEPLACEMENT, FORMULES, GABARITS, GARANTIE, OPTIONS, formule, option, type OptionId, type OptionTarif } from "@/data/offres";
import { DETAILS_PAIEMENT_SUR_PLACE } from "@/data/paiement";
import { MODES_PAIEMENT, PAIEMENT_EN_LIGNE, PHOTOS_DEMANDEES, TEXTE_EXECUTION_ANTICIPEE, type ModePaiement } from "@/data/reservation";
import { euros, initialeMinuscule } from "@/lib/texte";
import { fr } from "@/lib/typo";
import { AConfirmer } from "@/components/ui/ACompleter";
import { CLASSES_TEXTE } from "./classes";
import { CoordonneesAssocies } from "./Valeurs";

/**
 * Composants des conditions générales de vente (src/content/cgv.mdx) :
 * titres numérotés, sommaire, et textes tirés des données (prix, zones,
 * garantie, paiement, rétractation). Changer une valeur dans data/*.ts ou
 * config/site.ts la change dans les CGV.
 */

const SURTITRE = "block font-sans text-sm font-semibold uppercase tracking-[0.14em] text-accent";

/** Éléments d'une liste en phrase : « ; » entre eux, « . » à la fin. */
function ponctuer(elements: readonly string[]): string[] {
  return elements.map((e, i) => `${e}${i === elements.length - 1 ? "." : " ;"}`);
}

// ---------------------------------------------------------------------------
// Titres et sommaire
// ---------------------------------------------------------------------------

/** Rang d'un article (1 pour le premier), selon ARTICLES_CGV (data/legal.ts). */
export function numeroArticle(id: IdArticleCgv): number {
  return ARTICLES_CGV.findIndex((a) => a.id === id) + 1;
}

/** Titre d'un article, numéroté selon son rang dans ARTICLES_CGV (data/legal.ts). */
export function Article({ id }: { id: IdArticleCgv }) {
  const article = ARTICLES_CGV.find((a) => a.id === id);
  if (!article) throw new Error(`Article des CGV inconnu : ${id}`);
  return (
    <h2 id={id} className={CLASSES_TEXTE.h2}>
      <span className={SURTITRE}>Article {numeroArticle(id)}</span> {fr(article.titre)}
    </h2>
  );
}

/** Renvoi vers un autre article, numéroté selon son rang : « l'article 10 », avec le lien. */
export function RenvoiArticle({ id }: { id: IdArticleCgv }) {
  if (!ARTICLES_CGV.some((a) => a.id === id)) throw new Error(`Article des CGV inconnu : ${id}`);
  return (
    <a href={`#${id}`} className={`${CLASSES_TEXTE.lien} whitespace-nowrap`}>
      l&apos;article {numeroArticle(id)}
    </a>
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
            <span aria-hidden="true" className="w-5 shrink-0 text-right tabular-nums text-doux">
              {i + 1}.
            </span>
            <a href={`#${a.id}`} className={lien}>
              <span className="sr-only">Article {i + 1} : </span>
              {fr(a.titre)}
            </a>
          </li>
        ))}
        <li className="border-t border-bord pt-2">
          <a href={`#${ANNEXE_CGV.id}`} className={lien}>
            Annexe : {initialeMinuscule(ANNEXE_CGV.titre)}
          </a>
        </li>
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Prix (data/offres.ts)
// ---------------------------------------------------------------------------

/** Grille des formules par gabarit, prix TTC. Tient sans défilement sur un écran de 375 px. */
export function TableauPrix() {
  const th = "px-2 py-2.5 text-left align-bottom font-semibold sm:px-4";
  const td = "border-t border-bord px-2 py-2.5 align-top sm:px-4";
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-bord bg-blanc">
      <table className="w-full text-sm">
        <caption className="px-2 pt-3 text-left text-doux sm:px-4">Prix par gabarit de véhicule, en euros TTC</caption>
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
  if (typeof o.prix !== "number") return `de ${o.prix.min} à ${euros(o.prix.max)}`;
  if (o.unite) return `${euros(o.prix)} par ${o.unite.singulier}`;
  return euros(o.prix);
}

/** Prix d'une option, en ligne : `<PrixOption id="tres-sale" />`. */
export function PrixOption({ id }: { id: OptionId }) {
  return <>{fr(prixOption(option(id)))}</>;
}

/** Options et suppléments, avec leur prix et leur règle. */
export function ListeOptions() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {OPTIONS.map((o) => (
        <li key={o.id} className={CLASSES_TEXTE.li}>
          {o.libelle} : <strong className="font-semibold">{fr(prixOption(o))}</strong>
          <span className="text-doux"> ({fr(initialeMinuscule(o.regle))})</span>
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
  return <p className={CLASSES_TEXTE.p}>{fr(`Après ${noms}, ${initialeMinuscule(aSavoir)}`)}</p>;
}

/** Photos demandées à la réservation : « habitacle avant, habitacle arrière, extérieur ». */
export function PhotosDemandees() {
  return <>{PHOTOS_DEMANDEES.map((p) => initialeMinuscule(p.libelle)).join(", ")}</>;
}

// ---------------------------------------------------------------------------
// Intervention et zones (data/conditions.ts, config/site.ts)
// ---------------------------------------------------------------------------

/** Emplacements où nous intervenons. */
export function Emplacements() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      {ponctuer(EMPLACEMENTS.map(initialeMinuscule)).map((e) => (
        <li key={e} className={CLASSES_TEXTE.li}>
          {fr(e)}
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
        <strong className="font-semibold">{DEPLACEMENT.zone1.libelle}</strong>
        {fr(
          `, jusqu'à ${rayons.zone1} km de ${ville} (${zone1.length} communes) : déplacement inclus, pour une commande d'au moins ${euros(DEPLACEMENT.zone1.commandeMinimale)} ;`,
        )}
      </li>
      <li className={CLASSES_TEXTE.li}>
        <strong className="font-semibold">{DEPLACEMENT.zone2.libelle}</strong>
        {fr(
          `, de ${rayons.zone1} à ${rayons.zone2} km (${zone2.length} communes) : supplément de déplacement de ${euros(DEPLACEMENT.zone2.supplement)} par rendez-vous, avec au moins une de ces formules dans la commande : ${minimales} ;`,
        )}
      </li>
      <li className={CLASSES_TEXTE.li}>
        <strong className="font-semibold">{DEPLACEMENT.horsZone.libelle}</strong>
        {fr(` : sur demande, à partir de ${DEPLACEMENT.horsZone.vehiculesMinimum} véhicules au même rendez-vous.`)}
      </li>
    </ul>
  );
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

function libelleMode(id: ModePaiement): string {
  return MODES_PAIEMENT.find((m) => m.id === id)?.libelle ?? id;
}

/** Moyens de paiement, en ligne et sur place (data/reservation.ts, data/conditions.ts, data/paiement.ts). */
export function MoyensPaiement() {
  return (
    <ul className={CLASSES_TEXTE.ul}>
      <li className={CLASSES_TEXTE.li}>
        <strong className="font-semibold">{libelleMode("en-ligne")}</strong>
        {fr(` : ${initialeMinuscule(PAIEMENT_EN_LIGNE.join(", "))}, par le lien de paiement sécurisé que nous vous envoyons ;`)}
      </li>
      <li className={CLASSES_TEXTE.li}>
        <strong className="font-semibold">{libelleMode("sur-place")}</strong> :
        <ul className="mt-2 list-[circle] space-y-1 pl-6">
          {ponctuer(PAIEMENT_SUR_PLACE.map((m) => DETAILS_PAIEMENT_SUR_PLACE[m])).map((d) => (
            <li key={d} className={CLASSES_TEXTE.li}>
              {fr(d)}
            </li>
          ))}
        </ul>
      </li>
    </ul>
  );
}

/** Texte de la case d'exécution anticipée, cité mot pour mot depuis la réservation (data/reservation.ts). */
export function TexteExecutionAnticipee() {
  return (
    <blockquote className={CLASSES_TEXTE.citation}>
      <p>{fr(`« ${TEXTE_EXECUTION_ANTICIPEE} »`)}</p>
    </blockquote>
  );
}

/** Garantie Retouche : promesse, limites et exclusions (GARANTIE, data/offres.ts). */
export function Garantie() {
  return (
    <>
      <blockquote className={CLASSES_TEXTE.citation}>
        <p>{fr(GARANTIE.texte)}</p>
      </blockquote>
      <p className={CLASSES_TEXTE.p}>Ses limites :</p>
      <ul className={CLASSES_TEXTE.ul}>
        {ponctuer(GARANTIE.limites.map(initialeMinuscule)).map((l) => (
          <li key={l} className={CLASSES_TEXTE.li}>
            {fr(l)}
          </li>
        ))}
      </ul>
      <p className={CLASSES_TEXTE.p}>Elle ne couvre pas :</p>
      <ul className={CLASSES_TEXTE.ul}>
        {ponctuer(GARANTIE.exclusions.map(initialeMinuscule)).map((e) => (
          <li key={e} className={CLASSES_TEXTE.li}>
            {fr(e)}
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
      <span>{fr(libelle)}</span>
      <span aria-hidden="true" className="h-5 min-w-32 flex-1 border-b border-dotted border-texte/60" />
    </p>
  );
}

/**
 * Formulaire type de rétractation (modèle du Code de la consommation),
 * adapté à une prestation de services. À imprimer, ou à recopier dans un
 * e-mail.
 */
export function FormulaireRetractation() {
  return (
    <section aria-labelledby="titre-formulaire-retractation" className={CLASSES_TEXTE.encadre}>
      <h3 id="titre-formulaire-retractation" className="font-titre text-lg font-bold">
        Formulaire de rétractation
      </h3>
      <p className="mt-2 text-sm text-doux">
        (Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)
      </p>
      <p className="mt-4">
        {fr(
          "À l'attention de l'entrepreneur individuel qui réalise votre prestation (son nom figure sur la confirmation de votre rendez-vous et sur votre facture) :",
        )}
      </p>
      <CoordonneesAssocies />
      <p className="mt-4">
        {fr(
          "Je/nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :",
        )}
      </p>
      <Champ libelle="Prestation (formule, référence AN-…) :" />
      <Champ libelle="Commandé le :" />
      <Champ libelle="Nom du (des) consommateur(s) :" />
      <Champ libelle="Adresse du (des) consommateur(s) :" />
      <Champ libelle="Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :" />
      <Champ libelle="Date :" />
      <p className="mt-4 text-sm text-doux">(*) Rayez la mention inutile.</p>
    </section>
  );
}
