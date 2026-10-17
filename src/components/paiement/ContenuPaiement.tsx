import type { ReactNode } from "react";
import { connection } from "next/server";
import { site } from "@/config/site";
import {
  MENTION_MODE_TEST,
  MESSAGES_LIEN,
  PAIEMENT_BIENTOT_DISPONIBLE,
  REASSURANCE_PAIEMENT,
  type SituationLien,
} from "@/data/paiement";
import { formaterDateHeureParis } from "@/lib/date-paris";
import { CLES_LIEN, parametresLien } from "@/lib/encaissement/api";
import { configurationPayPal } from "@/lib/encaissement/paypal";
import { configurationStripe, motifIndisponible } from "@/lib/encaissement/stripe";
import { formaterEuros } from "@/lib/montant";
import type { LienPaiement } from "@/lib/paiement";
import { verifierLienPaiement } from "@/lib/paiement-serveur";
import { FORMAT_REFERENCE } from "@/lib/reservation/api";
import { fr } from "@/lib/typo";
import { PastilleErreur } from "@/components/reservation/Champs";
import { LiensContact } from "@/components/reservation/LiensContact";
import { ACompleter } from "@/components/ui/ACompleter";
import { BoutonPayer } from "./BoutonPayer";
import { LogosPaiement } from "./LogosPaiement";
import { PaiementPayPal } from "./PaiementPayPal";
import { PayerSurPlace } from "./PayerSurPlace";

/** Paramètres de l'adresse de la page, tels que Next.js les fournit. */
export type ParametresPage = Record<string, string | string[] | undefined>;

const ID_TITRE = "titre-paiement-contenu";

/**
 * Contenu de la page /paiement, rendu côté serveur : le lien est vérifié
 * ici (signature, montant, expiration), jamais dans le navigateur.
 */
export async function ContenuPaiement({ parametres }: { parametres: Promise<ParametresPage> }) {
  const params = await parametres;
  // L'expiration se compare à l'heure de la requête : jamais pendant un prérendu ou un préchargement.
  await connection();
  // Aucun paramètre de lien : le client est arrivé sans lien.
  if (CLES_LIEN.every((cle) => params[cle] === undefined)) return <SansPaiement situation="absent" reference={null} />;

  const verification = verifierLienPaiement(params);
  if (!verification.valide) {
    const brute = params.ref;
    const reference = typeof brute === "string" && FORMAT_REFERENCE.test(brute) ? brute : null;
    return <SansPaiement situation={verification.raison} reference={reference} />;
  }
  return <PaiementPropose lien={verification.lien} />;
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

/** Message prérempli dans WhatsApp, adapté à la situation. */
function messageContact(situation: SituationLien | "question", reference: string | null): string {
  const ref = reference ? ` (réf. ${reference})` : "";
  switch (situation) {
    case "absent":
      return `Bonjour ${site.nom}, je souhaite régler ma prestation.`;
    case "question":
      return `Bonjour ${site.nom}, j'ai une question sur le paiement de ma prestation${ref}.`;
    case "configuration":
      return `Bonjour ${site.nom}, je souhaite régler ma prestation${ref}.`;
    case "expire":
      return `Bonjour ${site.nom}, mon lien de paiement${ref} a expiré. Pouvez-vous m'en envoyer un nouveau ?`;
    default:
      return `Bonjour ${site.nom}, mon lien de paiement${ref} ne fonctionne pas. Pouvez-vous m'en envoyer un nouveau ?`;
  }
}

function Contacts({ titre, message }: { titre: string; message: string }) {
  return (
    <section aria-labelledby="titre-contacts-paiement" className="rounded-carte border border-bord-champ bg-blanc p-6">
      <h2 id="titre-contacts-paiement" className="font-sans text-lg font-bold tracking-normal">
        {titre}
      </h2>
      <LiensContact messageWhatsApp={message} className="mt-4" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Aucun paiement proposé : lien absent, refusé, ou paiement non configuré
// ---------------------------------------------------------------------------

const REFUS: readonly SituationLien[] = ["format", "signature", "expire", "montant"];

function SansPaiement({ situation, reference }: { situation: SituationLien; reference: string | null }) {
  const { titre, texte } = MESSAGES_LIEN[situation];
  const refuse = REFUS.includes(situation);
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <section
          aria-labelledby={ID_TITRE}
          className={`rounded-carte bg-blanc p-6 shadow-douce ${refuse ? "border-2 border-avertissement" : "border border-bord-champ"}`}
        >
          {refuse && (
            <p className="mb-2 flex items-center gap-2 font-semibold text-avertissement">
              <PastilleErreur />
              Paiement refusé
            </p>
          )}
          <h2 id={ID_TITRE} className="font-sans text-xl font-bold tracking-normal md:text-2xl">
            {fr(titre)}
          </h2>
          <p className="mt-3">{fr(texte)}</p>
          {reference && <p className="mt-3 text-sm text-doux">Référence indiquée dans le lien : {reference}</p>}
        </section>
        <Contacts titre="Nous contacter" message={messageContact(situation, reference)} />
      </div>
      <PayerSurPlace />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lien valide
// ---------------------------------------------------------------------------

function Ligne({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-doux">{terme}</dt>
      <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** « Paiement à [Prénom Nom] EI, SIREN […] », depuis config/site.ts (emplacements à compléter sinon). */
function Beneficiaire({ lien }: { lien: LienPaiement }) {
  const associe = site.associes[lien.encaisseur];
  return (
    <p className="mt-5">
      Paiement à{" "}
      <strong>
        <ACompleter valeur={associe.prenomNom} libelle={`nom de l'associé ${lien.encaisseur}`} /> EI
      </strong>
      , SIREN <ACompleter valeur={associe.siren} libelle={`SIREN de l'associé ${lien.encaisseur}`} />
    </p>
  );
}

/**
 * Bouton de paiement Stripe et, si PayPal est activé pour cet encaisseur,
 * bouton PayPal en secours. Sans aucun des deux (clé Stripe absente, ou clé
 * réelle hors production) : « Paiement en ligne bientôt disponible ».
 */
function ZonePaiement({ lien }: { lien: LienPaiement }) {
  const stripe = configurationStripe(lien.encaisseur);
  const paypal = configurationPayPal(lien.encaisseur);
  if (stripe.etat !== "prete" && stripe.etat !== "absente") console.error(`[paiement] ${motifIndisponible(lien.encaisseur, stripe)}`);
  if (paypal.etat === "incomplete" || paypal.etat === "reel-hors-production") {
    console.error(`[paiement] PayPal inutilisable pour l'encaisseur ${lien.encaisseur} (${paypal.etat})`);
  }
  const parametres = parametresLien(lien);

  if (stripe.etat !== "prete" && paypal.etat !== "pret") {
    return (
      <div className="rounded-2xl border border-bord bg-ecume p-5">
        <p className="font-semibold">{PAIEMENT_BIENTOT_DISPONIBLE}</p>
        <p className="mt-1 text-sm text-doux">
          {stripe.etat === "reel-hors-production"
            ? fr("Cette version d'essai du site n'encaisse aucun paiement réel. Contactez-nous, ou réglez sur place après la prestation.")
            : fr("En attendant, contactez-nous ou réglez sur place après la prestation.")}
        </p>
      </div>
    );
  }
  return (
    <div>
      {stripe.etat === "prete" && (
        <>
          {stripe.mode === "test" && (
            <p className="mb-4 rounded-xl border border-avertissement/40 bg-alerte/15 px-4 py-2 text-sm font-semibold text-avertissement">
              {MENTION_MODE_TEST}
            </p>
          )}
          <BoutonPayer lien={parametres} libelle={`Payer ${formaterEuros(lien.centimes)} en ligne`} />
          <LogosPaiement className="mt-3" />
          <p className="mt-3 text-sm text-doux">{fr(REASSURANCE_PAIEMENT)}</p>
        </>
      )}
      {paypal.etat === "pret" && (
        <PaiementPayPal
          lien={parametres}
          clientId={paypal.clientId}
          environnement={paypal.environnement}
          separe={stripe.etat === "prete"}
        />
      )}
    </div>
  );
}

function PaiementPropose({ lien }: { lien: LienPaiement }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <section
        aria-labelledby={ID_TITRE}
        className="rounded-carte border border-bord-champ bg-blanc p-6 shadow-douce md:p-8"
      >
        <h2 id={ID_TITRE} className="font-sans text-xl font-bold tracking-normal md:text-2xl">
          Votre prestation
        </h2>
        <dl className="mt-3 divide-y divide-bord border-y border-bord">
          <Ligne terme="Prestation">{lien.libelle}</Ligne>
          <Ligne terme="Référence">{lien.ref}</Ligne>
          <Ligne terme="Montant">
            <span className="font-titre text-2xl font-extrabold">{formaterEuros(lien.centimes)}</span>
          </Ligne>
        </dl>
        <Beneficiaire lien={lien} />
        <p className="mt-1 text-sm text-doux">{site.mentionTva}.</p>
        <p className="mt-1 text-sm text-doux">
          Lien valable jusqu&apos;au {formaterDateHeureParis(new Date(lien.exp * 1000))}.
        </p>
        <div className="mt-6">
          <ZonePaiement lien={lien} />
        </div>
      </section>

      <div className="space-y-6">
        <PayerSurPlace titre="Vous préférez payer sur place ?" />
        <Contacts titre="Une question ?" message={messageContact("question", lien.ref)} />
      </div>
    </div>
  );
}
