import type { ReactNode } from "react";
import { estRenseigne, site, type Encaisseur } from "@/config/site";
import { lienEmail, lienTelephone } from "@/lib/contact";
import { ACompleter } from "@/components/ui/ACompleter";
import { CLASSES_TEXTE } from "./classes";

/**
 * Valeurs de configuration injectées dans les textes MDX (src/content) :
 * jamais recopiées dans le texte. Une valeur vide de config/site.ts
 * s'affiche en emplacement visible « [À COMPLÉTER : …] ».
 */

const LETTRES: readonly Encaisseur[] = ["A", "B"];

/** Ligne « terme : valeur » d'une liste de définitions. */
export function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className={CLASSES_TEXTE.ligneDl}>
      <dt className={CLASSES_TEXTE.dt}>{terme}</dt>
      <dd className={CLASSES_TEXTE.dd}>{children}</dd>
    </div>
  );
}

/** Lien `mailto:` vers une adresse, ou emplacement si elle manque. */
export function Email({ adresse, libelle }: { adresse: string; libelle: string }) {
  if (!estRenseigne(adresse)) return <ACompleter libelle={libelle} />;
  return (
    <a href={`mailto:${adresse}`} className={CLASSES_TEXTE.lien}>
      {adresse}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Associés (site.associes)
// ---------------------------------------------------------------------------

/** « Prénom Nom EI » d'un associé (ou emplacement). */
export function NomAssocie({ lettre }: { lettre: Encaisseur }) {
  return (
    <>
      <ACompleter valeur={site.associes[lettre].prenomNom} libelle={`nom de l'associé ${lettre}`} /> EI
    </>
  );
}

/** « Prénom Nom EI et Prénom Nom EI ». */
export function NomsAssocies() {
  return (
    <>
      <NomAssocie lettre="A" /> et <NomAssocie lettre="B" />
    </>
  );
}

/** Identité complète d'un associé, pour les mentions légales. */
export function IdentiteAssocie({ lettre }: { lettre: Encaisseur }) {
  const a = site.associes[lettre];
  return (
    <div>
      <h3 id={`associe-${lettre.toLowerCase()}`} className={CLASSES_TEXTE.h3}>
        <NomAssocie lettre={lettre} />
      </h3>
      <dl className={CLASSES_TEXTE.dl}>
        <Ligne terme="Statut">Entrepreneur individuel (EI)</Ligne>
        <Ligne terme="Adresse">
          <ACompleter valeur={a.adresse} libelle={`adresse de l'associé ${lettre}`} />
        </Ligne>
        <Ligne terme="SIREN">
          <ACompleter valeur={a.siren} libelle={`SIREN de l'associé ${lettre}`} />
        </Ligne>
        <Ligne terme="Immatriculation">
          <ACompleter valeur={a.immatriculation} libelle={`registre d'immatriculation de l'associé ${lettre}`} />
        </Ligne>
        <Ligne terme="E-mail">
          <Email adresse={a.email} libelle={`e-mail de l'associé ${lettre}`} />
        </Ligne>
        <Ligne terme="Téléphone">
          <ACompleter valeur={a.telephone} libelle={`téléphone de l'associé ${lettre}`} />
        </Ligne>
      </dl>
    </div>
  );
}

/** Nom, adresse et e-mail de chaque associé, en liste (rétractation, exercice des droits). */
export function CoordonneesAssocies() {
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

/** Les deux associés, l'un après l'autre. */
export function Associes() {
  return (
    <>
      {LETTRES.map((lettre) => (
        <IdentiteAssocie key={lettre} lettre={lettre} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Contacts, TVA, hébergeur, médiateur, assurance
// ---------------------------------------------------------------------------

/** Contacts communs du site (e-mail, téléphone). */
export function ContactSite() {
  const email = lienEmail();
  const telephone = lienTelephone();
  return (
    <dl className={CLASSES_TEXTE.dl}>
      <Ligne terme="E-mail">
        {email ? (
          <a href={email} className={CLASSES_TEXTE.lien}>
            {site.email}
          </a>
        ) : (
          <ACompleter libelle="e-mail" />
        )}
      </Ligne>
      <Ligne terme="Téléphone">
        {telephone ? (
          <a href={telephone} className={CLASSES_TEXTE.lien}>
            {site.telephone}
          </a>
        ) : (
          <ACompleter libelle="téléphone" />
        )}
      </Ligne>
    </dl>
  );
}

/** « TVA non applicable, article 293 B du CGI » (site.mentionTva). */
export function MentionTva() {
  return <>{site.mentionTva}</>;
}

/** Hébergeur du site (site.hebergeur). */
export function Hebergeur() {
  const h = site.hebergeur;
  return (
    <dl className={CLASSES_TEXTE.dl}>
      <Ligne terme="Raison sociale">
        <NomHebergeur />
      </Ligne>
      <Ligne terme="Adresse">
        <ACompleter valeur={h.adresse} libelle="adresse de l'hébergeur" />
      </Ligne>
      <Ligne terme="Téléphone">
        <ACompleter valeur={h.telephone} libelle="téléphone de l'hébergeur" />
      </Ligne>
    </dl>
  );
}

/** Raison sociale de l'hébergeur, en ligne (ou emplacement). */
export function NomHebergeur() {
  return <ACompleter valeur={site.hebergeur.raisonSociale} libelle="raison sociale de l'hébergeur" />;
}

/** Nom du médiateur de la consommation, en ligne (ou emplacement). */
export function NomMediateur() {
  return <ACompleter valeur={site.mediateur.nom} libelle="nom du médiateur de la consommation" />;
}

/** Médiateur de la consommation (site.mediateur). */
export function Mediateur() {
  const m = site.mediateur;
  return (
    <dl className={CLASSES_TEXTE.dl}>
      <Ligne terme="Médiateur">
        <NomMediateur />
      </Ligne>
      <Ligne terme="Adresse">
        <ACompleter valeur={m.adresse} libelle="adresse du médiateur" />
      </Ligne>
      <Ligne terme="Site internet">
        {estRenseigne(m.site) ? (
          <a href={m.site} className={CLASSES_TEXTE.lien} target="_blank" rel="noopener noreferrer">
            {m.site.replace(/^https?:\/\//, "")}
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        ) : (
          <ACompleter libelle="site du médiateur" />
        )}
      </Ligne>
    </dl>
  );
}

/** Assurance responsabilité civile professionnelle (site.assurance). */
export function Assurance() {
  const a = site.assurance;
  return (
    <dl className={CLASSES_TEXTE.dl}>
      <Ligne terme="Assureur">
        <ACompleter valeur={a.assureur} libelle="assureur" />
      </Ligne>
      <Ligne terme="Contrat n°">
        <ACompleter valeur={a.numeroContrat} libelle="numéro de contrat" />
      </Ligne>
    </dl>
  );
}

/** Assurance en une ligne : « assureur, contrat n° … ». */
export function AssuranceEnLigne() {
  const a = site.assurance;
  return (
    <>
      <ACompleter valeur={a.assureur} libelle="assureur" />, contrat n°{" "}
      <ACompleter valeur={a.numeroContrat} libelle="numéro de contrat" />
    </>
  );
}
