import type { ReactNode } from "react";
import { connection } from "next/server";
import { site } from "@/config/site";
import { RAPPELS_APRES_PAIEMENT, VALIDITE_LIEN_JOURS } from "@/data/paiement";
import { etatPaiementRetour, type EtatPaiement } from "@/lib/encaissement/retour";
import { formaterEuros } from "@/lib/montant";
import { fr } from "@/lib/typo";
import { Surtitre } from "@/components/sections/EnTetes";
import { LiensContact } from "@/components/reservation/LiensContact";
import { Bouton } from "@/components/ui/Bouton";
import { MesurePaiementReussi } from "./MesurePaiementReussi";
import type { ParametresPage } from "./ContenuPaiement";

/** En-tête sombre de la page, avec son titre. */
export function EnTeteMerci({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <section className="theme-sombre relative isolate overflow-hidden pb-10 pt-28 md:pb-14 md:pt-36">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
      />
      <div className="conteneur">
        <Surtitre>Paiement</Surtitre>
        <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] md:text-5xl">{titre}</h1>
        {children}
      </div>
    </section>
  );
}

const TITRES: Record<EtatPaiement["statut"], string> = {
  paye: "Merci, paiement reçu",
  "en-cours": "Paiement en cours",
  "non-paye": "Paiement non finalisé",
  inconnu: "Merci",
};

function montant(centimes: number | null): string {
  return centimes === null ? "" : ` de ${formaterEuros(centimes)}`;
}

/** « (réf. AN-2026-0142) », sans retour à la ligne au milieu de la référence. */
function Ref({ reference }: { reference: string | null }) {
  if (!reference) return null;
  return (
    <>
      {" "}
      <span className="whitespace-nowrap">(réf. {reference})</span>
    </>
  );
}

const TITRE_MESSAGE = "font-sans text-xl font-bold tracking-normal md:text-2xl";

function Message({ etat }: { etat: EtatPaiement }) {
  switch (etat.statut) {
    case "paye":
      return (
        <>
          <h2 className={TITRE_MESSAGE}>Votre paiement est bien reçu.</h2>
          <p className="mt-3">
            {fr(`Nous avons reçu votre paiement${montant(etat.centimes)} pour votre prestation`)}
            <Ref reference={etat.reference} />. Merci !
          </p>
          <MesurePaiementReussi identifiant={etat.identifiant} moyen={etat.moyen} />
        </>
      );
    case "en-cours":
      return (
        <>
          <h2 className={TITRE_MESSAGE}>Votre paiement est en cours de traitement.</h2>
          <p className="mt-3">
            {fr(`Votre paiement${montant(etat.centimes)}`)}
            <Ref reference={etat.reference} />
            {fr(
              " doit encore être confirmé par votre banque : cela peut prendre quelques jours. Nous vous prévenons dès qu'il est reçu. Rien d'autre à faire de votre côté.",
            )}
          </p>
        </>
      );
    case "non-paye":
      return (
        <>
          <h2 className={TITRE_MESSAGE}>Le paiement n&apos;a pas abouti.</h2>
          <p className="mt-3">
            Aucun montant n&apos;a été débité
            <Ref reference={etat.reference} />
            {fr(
              `. Pour réessayer, rouvrez le lien de paiement reçu par message : il reste valable ${VALIDITE_LIEN_JOURS} jours après son envoi. Vous pouvez aussi régler sur place après la prestation.`,
            )}
          </p>
        </>
      );
    case "inconnu":
      return (
        <>
          <h2 className={TITRE_MESSAGE}>Merci pour votre confiance.</h2>
          <p className="mt-3">
            Si votre paiement a abouti
            <Ref reference={etat.reference} />
            {fr(
              ", nous le recevons automatiquement de notre côté. En cas de doute, contactez-nous en rappelant votre référence.",
            )}
          </p>
        </>
      );
  }
}

/**
 * Page /paiement/merci : en-tête et contenu dépendent de l'état réel du
 * paiement, vérifié côté serveur à chaque visite.
 */
export async function ContenuMerci({ parametres }: { parametres: Promise<ParametresPage> }) {
  const params = await parametres;
  // L'état se lit chez Stripe ou PayPal au moment de la visite, jamais pendant un prérendu.
  await connection();
  const etat = await etatPaiementRetour(params);
  const rappels = etat.statut !== "non-paye";
  const message = `Bonjour ${site.nom}, j'ai une question sur le paiement de ma prestation${etat.reference ? ` (réf. ${etat.reference})` : ""}.`;

  return (
    <>
      <EnTeteMerci titre={TITRES[etat.statut]} />
      <section aria-label="Suite de votre paiement" className="theme-clair py-10 md:py-16">
        <div className="conteneur grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <div
              className={`rounded-carte bg-blanc p-6 shadow-douce ${etat.statut === "non-paye" ? "border-2 border-avertissement" : "border border-bord-champ"}`}
            >
              <Message etat={etat} />
            </div>
            {rappels && (
              <section aria-labelledby="titre-suite-paiement" className="rounded-carte border border-bord-champ bg-blanc p-6">
                <h2 id="titre-suite-paiement" className="font-sans text-lg font-bold tracking-normal">
                  Et maintenant ?
                </h2>
                <ul className="mt-3 space-y-2">
                  {RAPPELS_APRES_PAIEMENT.map((r) => (
                    <li key={r} className="flex gap-3">
                      <span aria-hidden="true" className="font-bold text-accent">
                        ✓
                      </span>
                      {fr(r)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="space-y-6">
            <section aria-labelledby="titre-contacts-merci" className="rounded-carte border border-bord-champ bg-blanc p-6">
              <h2 id="titre-contacts-merci" className="font-sans text-lg font-bold tracking-normal">
                Une question ?
              </h2>
              <LiensContact messageWhatsApp={message} className="mt-4" />
            </section>
            <Bouton href="/" variante="secondaire">
              Retour à l&apos;accueil
            </Bouton>
          </div>
        </div>
      </section>
    </>
  );
}
