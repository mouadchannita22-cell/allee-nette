"use client";

import { useRef, useState } from "react";
import { suivre } from "@/lib/analytics";
import {
  URL_API_PAYPAL_CAPTURE,
  URL_API_PAYPAL_COMMANDE,
  lireReponseCapture,
  lireReponseCommande,
  type ParametresLien,
} from "@/lib/encaissement/api";
import { Bouton } from "@/components/ui/Bouton";
import { PastilleErreur } from "@/components/reservation/Champs";

type Props = {
  /** Paramètres signés du lien, renvoyés tels quels au serveur qui les revérifie. */
  lien: ParametresLien;
  /** Identifiant public PayPal de l'encaisseur (jamais le secret). */
  clientId: string;
  environnement: "sandbox" | "live";
  /** Sous le bouton de paiement par carte : séparé par un filet. */
  separe?: boolean;
};

type Sdk = "attente" | "chargement" | "pret" | "indisponible";
type Message = { texte: string; erreur: boolean };

const MESSAGE_HORS_LIGNE = "Connexion impossible. Vérifiez votre réseau, puis réessayez.";
const MESSAGE_ERREUR = "PayPal a rencontré un problème. Rien n'a été débité : réessayez, ou payez par carte.";
const ID_BOUTONS = "boutons-paypal";

async function envoyer(url: string, corps: unknown): Promise<unknown> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    return await r.json().catch(() => null);
  } catch {
    return { ok: false, message: MESSAGE_HORS_LIGNE };
  }
}

/**
 * Bouton secondaire « Payer avec PayPal ». Le SDK JavaScript de PayPal
 * (@paypal/paypal-js) n'est chargé qu'après un clic : aucun script ni cookie
 * PayPal tant que le client ne l'a pas demandé. La commande est créée et
 * capturée côté serveur, au montant du lien vérifié.
 */
export function PaiementPayPal({ lien, clientId, environnement, separe = true }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [sdk, setSdk] = useState<Sdk>("attente");
  const [message, setMessage] = useState<Message | null>(null);

  const charger = async () => {
    if (sdk === "chargement" || sdk === "pret") return;
    setSdk("chargement");
    setMessage(null);
    try {
      const { loadScript } = await import("@paypal/paypal-js");
      const paypal = await loadScript({
        clientId,
        environment: environnement === "live" ? "production" : "sandbox",
        currency: "EUR",
        intent: "capture",
        locale: "fr_FR",
        components: "buttons",
        // Paiement en plusieurs fois (crédit) et carte sans compte : non proposés ici.
        disableFunding: ["paylater", "card"],
      });
      const element = conteneur.current;
      if (!paypal?.Buttons || !element) throw new Error("SDK PayPal indisponible");

      await paypal
        .Buttons({
          fundingSource: paypal.FUNDING?.PAYPAL,
          style: { layout: "vertical", shape: "pill", label: "pay", height: 48 },
          createOrder: async () => {
            suivre("paiement_initie", { moyen: "paypal" });
            setMessage(null);
            const r = lireReponseCommande(await envoyer(URL_API_PAYPAL_COMMANDE, lien));
            if (!r.ok) {
              setMessage({ texte: r.message, erreur: true });
              throw new Error("Commande refusée");
            }
            return r.id;
          },
          onApprove: async (data, actions) => {
            setMessage({ texte: "Confirmation de votre paiement PayPal…", erreur: false });
            const r = lireReponseCapture(await envoyer(URL_API_PAYPAL_CAPTURE, { ...lien, commande: data.orderID }));
            if (r.ok) {
              window.location.assign(r.redirection);
              return;
            }
            setMessage({ texte: r.message, erreur: true });
            if (r.relancer) actions.restart();
          },
          onCancel: () => setMessage({ texte: "Paiement PayPal annulé : rien n'a été débité.", erreur: false }),
          // Une erreur déjà expliquée (commande refusée par le serveur) garde son message.
          onError: () => setMessage((m) => (m?.erreur ? m : { texte: MESSAGE_ERREUR, erreur: true })),
        })
        .render(element);

      setSdk("pret");
      setMessage({ texte: "PayPal est prêt : utilisez le bouton PayPal ci-dessous.", erreur: false });
      element.focus();
    } catch {
      setSdk("indisponible");
      setMessage({
        texte: "PayPal n'a pas pu se charger. Vérifiez votre connexion, puis réessayez, ou payez par carte ou sur place.",
        erreur: true,
      });
    }
  };

  return (
    <div className={separe ? "mt-6 border-t border-bord pt-6" : ""}>
      <p className="font-semibold">Vous préférez PayPal ?</p>
      {environnement === "sandbox" && (
        <p className="mt-2 text-sm text-avertissement">PayPal en mode test (bac à sable) : aucun débit réel.</p>
      )}
      {sdk !== "pret" && (
        <Bouton
          variante="secondaire"
          className="mt-3 w-full"
          onClick={charger}
          aria-disabled={sdk === "chargement" || undefined}
        >
          {sdk === "chargement" ? "Chargement de PayPal…" : "Payer avec PayPal"}
        </Bouton>
      )}
      <div id={ID_BOUTONS} ref={conteneur} tabIndex={-1} role="group" aria-label="Paiement PayPal" className="mt-3 outline-none" />
      <p className="mt-2 text-xs text-doux">
        PayPal ne se charge que si vous cliquez : aucun script ni cookie PayPal avant.
      </p>
      <p aria-live="polite" className="mt-2 text-sm">
        {message && !message.erreur ? message.texte : ""}
      </p>
      {message?.erreur && (
        <p role="alert" className="mt-2 flex gap-2 rounded-2xl border-2 border-avertissement bg-blanc p-4 font-semibold text-avertissement">
          <PastilleErreur />
          <span>{message.texte}</span>
        </p>
      )}
    </div>
  );
}
