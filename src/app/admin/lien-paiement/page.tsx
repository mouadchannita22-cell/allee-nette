import { Suspense } from "react";
import { headers } from "next/headers";
import { ouACompleter, site } from "@/config/site";
import { VALIDITE_LIEN_JOURS } from "@/data/paiement";
import { MESSAGE_REFUSE, verifierAuthentification } from "@/lib/admin/authentification";
import { anneeParis } from "@/lib/date-paris";
import { liensPaiementConfigures } from "@/lib/paiement-serveur";
import { metadonnees } from "@/lib/seo";
import { fr } from "@/lib/typo";
import { Surtitre } from "@/components/sections/EnTetes";
import { FormulaireLienPaiement } from "@/components/admin/FormulaireLienPaiement";

// Page interne : protégée par mot de passe (src/proxy.ts), jamais indexée, absente du plan du site.
export const metadata = metadonnees({
  titre: "Lien de paiement",
  description: "Administration : générer un lien de paiement signé.",
  chemin: "/admin/lien-paiement",
  indexer: false,
});

/**
 * Lit la requête : l'authentification est revérifiée ici (le proxy l'a déjà
 * contrôlée), puis l'année en cours sert à préremplir la référence.
 */
async function Administration() {
  const entetes = await headers();
  const etat = await verifierAuthentification(entetes.get("authorization"), process.env.ADMIN_PASSWORD);
  if (etat !== "autorise") {
    return <p className="mx-auto max-w-2xl rounded-carte border border-bord-champ bg-blanc p-6">{MESSAGE_REFUSE}</p>;
  }
  return (
    <>
      {/* Rendu ici, côté serveur : le nom de la variable n'a rien à faire dans le JavaScript du navigateur. */}
      {!liensPaiementConfigures() && (
        <p
          role="alert"
          className="mx-auto mb-8 max-w-2xl rounded-2xl border-2 border-avertissement bg-blanc p-5 font-semibold text-avertissement"
        >
          Les liens ne peuvent pas encore être générés : ajoutez PAYMENT_LINK_SECRET (32 caractères au moins) aux
          variables d&apos;environnement, puis redéployez.
        </p>
      )}
      <FormulaireLienPaiement
        annee={anneeParis(new Date())}
        associes={{
          A: ouACompleter(site.associes.A.prenomNom, "nom de l'associé A"),
          B: ouACompleter(site.associes.B.prenomNom, "nom de l'associé B"),
        }}
      />
    </>
  );
}

export default function PageLienPaiement() {
  return (
    <div data-sans-barre-mobile="">
      <section className="theme-sombre relative isolate overflow-hidden pb-10 pt-28 md:pb-14 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_85%_0%,rgb(46_230_214/0.14),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(15_42_74/0.9),transparent_70%)]"
        />
        <div className="conteneur">
          <Surtitre>Administration</Surtitre>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.05] md:text-5xl">Lien de paiement</h1>
          <p className="mt-4 max-w-2xl text-doux md:text-lg">
            {fr(
              `Une fois le prix ferme confirmé, générez un lien sécurisé, valable ${VALIDITE_LIEN_JOURS} jours, puis envoyez-le au client par WhatsApp ou par SMS.`,
            )}
          </p>
        </div>
      </section>

      <section aria-label="Générer un lien de paiement" className="theme-clair py-10 md:py-16">
        <div className="conteneur">
          <Suspense fallback={<p role="status" className="mx-auto max-w-2xl text-doux">Chargement du formulaire…</p>}>
            <Administration />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
