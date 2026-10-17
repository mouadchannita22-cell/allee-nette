"use client";

import { useEffect, useState } from "react";
import { suivre } from "@/lib/analytics";
import { URL_API_SESSION, lireReponseSession, type ParametresLien, type ReponseSession } from "@/lib/encaissement/api";
import { Bouton } from "@/components/ui/Bouton";
import { PastilleErreur } from "@/components/reservation/Champs";

type Props = {
  /** Paramètres signés du lien, renvoyés tels quels au serveur qui les revérifie. */
  lien: ParametresLien;
  /** « Payer 119,50 € en ligne ». */
  libelle: string;
};

type Etat = { statut: "pret" } | { statut: "envoi" } | { statut: "erreur"; message: string };

const MESSAGE_HORS_LIGNE = "Connexion impossible. Vérifiez votre réseau, puis réessayez.";

/**
 * Bouton principal de la page /paiement : le serveur crée la session Stripe
 * Checkout, puis le navigateur part vers la page de paiement sécurisée de
 * Stripe. Aucune donnée bancaire ne passe par notre site.
 */
export function BoutonPayer({ lien, libelle }: Props) {
  const [etat, setEtat] = useState<Etat>({ statut: "pret" });

  // Retour arrière depuis Stripe : la page sort du cache du navigateur, le bouton redevient utilisable.
  useEffect(() => {
    const reprendre = (e: PageTransitionEvent) => {
      if (e.persisted) setEtat({ statut: "pret" });
    };
    window.addEventListener("pageshow", reprendre);
    return () => window.removeEventListener("pageshow", reprendre);
  }, []);

  const payer = async () => {
    if (etat.statut === "envoi") return;
    setEtat({ statut: "envoi" });
    suivre("paiement_initie", { moyen: "stripe" });

    let reponse: ReponseSession;
    try {
      const r = await fetch(URL_API_SESSION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lien),
      });
      reponse = lireReponseSession(await r.json().catch(() => null));
    } catch {
      reponse = { ok: false, message: MESSAGE_HORS_LIGNE };
    }

    if (reponse.ok) {
      window.location.assign(reponse.url);
      return;
    }
    setEtat({ statut: "erreur", message: reponse.message });
  };

  return (
    <div>
      <Bouton taille="lg" className="w-full" onClick={payer} aria-disabled={etat.statut === "envoi" || undefined}>
        {libelle}
      </Bouton>
      <p aria-live="polite" className="mt-2 min-h-5 text-center text-sm text-doux">
        {etat.statut === "envoi" ? "Redirection vers la page de paiement sécurisée de Stripe…" : ""}
      </p>
      {etat.statut === "erreur" && (
        <p role="alert" className="mt-2 flex gap-2 rounded-2xl border-2 border-avertissement bg-blanc p-4 font-semibold text-avertissement">
          <PastilleErreur />
          <span>{etat.message}</span>
        </p>
      )}
    </div>
  );
}
