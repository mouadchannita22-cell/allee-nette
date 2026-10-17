"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Encaisseur } from "@/config/site";
import { BORNES_MONTANT, LIBELLE_MAX, VALIDITE_LIEN_JOURS } from "@/data/paiement";
import {
  URL_API_LIEN_PAIEMENT,
  lienSmsPaiement,
  lienWhatsAppPaiement,
  lireReponseLien,
  messageLienPaiement,
  suggestionsLibelle,
  telephonePartage,
  type ChampDemande,
  type DemandeLien,
  type LienGenere,
  type ReponseLien,
} from "@/lib/admin/lien-paiement";
import { formaterDateHeureParis } from "@/lib/date-paris";
import { formaterEuros } from "@/lib/montant";
import { idChamp } from "@/lib/reservation/champs";
import { ChampTexte, GroupeChoix, PastilleErreur } from "@/components/reservation/Champs";
import { Bouton, classesBouton } from "@/components/ui/Bouton";
import { IconeMessage } from "@/components/ui/Icones";

type Props = {
  /** Année en cours à Paris, pour préremplir la référence (« AN-2026- »). */
  annee: number;
  /** Nom de chaque associé, ou emplacement « à compléter ». */
  associes: Record<Encaisseur, string>;
};

type Envoi =
  | { statut: "saisie" }
  | { statut: "envoi" }
  | { statut: "erreur"; message: string; champs?: Partial<Record<ChampDemande, string>> }
  | { statut: "pret"; lien: LienGenere };

const SUGGESTIONS = suggestionsLibelle();
const ID_SUGGESTIONS = "suggestions-libelle";
const ID_ERREUR = "erreur-lien";
const ID_RESULTAT = "lien-pret";
const ORDRE_CHAMPS: readonly ChampDemande[] = ["ref", "montant", "libelle", "encaisseur"];

const MESSAGE_HORS_LIGNE = "Connexion impossible. Vérifiez votre réseau, puis réessayez.";

/** Donne le focus à un élément après le rendu (champ en erreur, lien généré). */
function viser(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}

/**
 * Formulaire de la page /admin/lien-paiement : saisie, génération côté
 * serveur, puis partage du lien (copie, WhatsApp, SMS). Le formulaire reste
 * affiché : modifier une donnée signée retire le lien devenu périmé.
 */
export function FormulaireLienPaiement({ annee, associes }: Props) {
  const [demande, setDemande] = useState<DemandeLien>({ ref: `AN-${annee}-`, montant: "", libelle: "", encaisseur: "" });
  const [telephone, setTelephone] = useState("");
  const [envoi, setEnvoi] = useState<Envoi>({ statut: "saisie" });
  const [annonce, setAnnonce] = useState("");

  const erreurs = envoi.statut === "erreur" ? (envoi.champs ?? {}) : {};
  const suggestion = SUGGESTIONS.find((s) => s.libelle === demande.libelle.trim());

  const modifier = (cle: ChampDemande, valeur: string) => {
    setDemande((d) => ({ ...d, [cle]: valeur }));
    // Le lien affiché ne correspond plus à la saisie.
    if (envoi.statut === "pret") setEnvoi({ statut: "saisie" });
  };

  const generer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (envoi.statut === "envoi") return;
    setEnvoi({ statut: "envoi" });
    setAnnonce("Génération du lien en cours.");

    let reponse: ReponseLien;
    try {
      const r = await fetch(URL_API_LIEN_PAIEMENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande),
        cache: "no-store",
      });
      reponse = lireReponseLien(await r.json().catch(() => null), r.status);
    } catch {
      reponse = { ok: false, message: MESSAGE_HORS_LIGNE };
    }

    if (!reponse.ok) {
      setEnvoi({ statut: "erreur", message: reponse.message, champs: reponse.champs });
      setAnnonce("");
      const premier = ORDRE_CHAMPS.find((c) => reponse.champs?.[c]);
      viser(premier ? idChamp(premier) : ID_ERREUR);
      return;
    }

    const lien: LienGenere = {
      url: reponse.url,
      expireLe: reponse.expireLe,
      ref: reponse.ref,
      centimes: reponse.centimes,
      libelle: reponse.libelle,
      encaisseur: reponse.encaisseur,
    };
    setEnvoi({ statut: "pret", lien });
    setAnnonce(`Lien généré, valable jusqu'au ${formaterDateHeureParis(new Date(lien.expireLe))}.`);
    viser(ID_RESULTAT);
  };

  const enEnvoi = envoi.statut === "envoi";

  return (
    <div className="mx-auto max-w-2xl">
      <form noValidate onSubmit={generer} aria-labelledby="titre-formulaire-lien" className="space-y-6">
        <h2 id="titre-formulaire-lien" className="text-2xl font-bold leading-tight">
          Nouveau lien
        </h2>

        <ChampTexte
          cle="ref"
          libelle="Référence de la demande"
          valeur={demande.ref}
          onChange={(v) => modifier("ref", v)}
          erreur={erreurs.ref}
          aide="Au format AN-2026-0142, comme dans l'e-mail de la demande."
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
        />

        <ChampTexte
          cle="libelle"
          libelle="Prestation"
          valeur={demande.libelle}
          onChange={(v) => modifier("libelle", v)}
          erreur={erreurs.libelle}
          aide={`Choisissez une suggestion ou écrivez librement, ${LIBELLE_MAX} caractères au plus. Le client la voit sur la page de paiement.`}
          maxLength={LIBELLE_MAX}
          autoComplete="off"
          list={ID_SUGGESTIONS}
          placeholder="Le Complet M"
        />
        <datalist id={ID_SUGGESTIONS}>
          {SUGGESTIONS.map((s) => (
            <option key={s.libelle} value={s.libelle} label={formaterEuros(s.prix * 100)} />
          ))}
        </datalist>

        <ChampTexte
          cle="montant"
          libelle="Montant à payer, en euros"
          valeur={demande.montant}
          onChange={(v) => modifier("montant", v)}
          erreur={erreurs.montant}
          aide={
            suggestion
              ? `Prix de la grille pour ${suggestion.libelle} : ${formaterEuros(suggestion.prix * 100)}, avant options et déplacement.`
              : `Entre ${BORNES_MONTANT.minEuros} et ${BORNES_MONTANT.maxEuros} €, par exemple 119 ou 119,50.`
          }
          aideVivante
          maxLength={9}
          inputMode="decimal"
          autoComplete="off"
          classeChamp="max-w-48"
        />

        <GroupeChoix
          cle="encaisseur"
          legende="Qui encaisse ?"
          aide="Le paiement arrive sur le compte de cet associé, qui établit la facture."
          choix={(["A", "B"] as const).map((id) => ({ id, libelle: `${id} · ${associes[id]}` }))}
          valeur={demande.encaisseur}
          onChange={(id) => modifier("encaisseur", id)}
          erreur={erreurs.encaisseur}
          grille="sm:grid-cols-2"
        />

        <ChampTexte
          cle="telephone"
          libelle="Téléphone du client"
          facultatif
          valeur={telephone}
          onChange={setTelephone}
          // Signalé une fois le lien prêt, pour ne pas interrompre la saisie.
          erreur={
            envoi.statut === "pret" && telephonePartage(telephone) === false
              ? "Numéro non reconnu : WhatsApp et SMS s'ouvriront sans destinataire. Vérifiez-le, ou laissez le champ vide."
              : undefined
          }
          aide="Pour ouvrir WhatsApp ou les SMS directement sur sa conversation. Il reste sur cet appareil."
          type="tel"
          maxLength={20}
          autoComplete="off"
          inputMode="tel"
        />

        {envoi.statut === "erreur" && (
          <div id={ID_ERREUR} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-avertissement bg-blanc p-5">
            <p className="flex gap-2 font-semibold text-avertissement">
              <PastilleErreur />
              <span>{envoi.message}</span>
            </p>
          </div>
        )}

        <Bouton type="submit" taille="lg" disabled={enEnvoi} className="w-full sm:w-auto">
          {enEnvoi ? "Génération…" : "Générer le lien"}
        </Bouton>
        <p aria-live="polite" className="sr-only">
          {annonce}
        </p>
      </form>

      {envoi.statut === "pret" && (
        <LienPret
          lien={envoi.lien}
          associe={associes[envoi.lien.encaisseur]}
          telephone={telephonePartage(telephone) || null}
          onNouveau={() => {
            setDemande({ ref: `AN-${annee}-`, montant: "", libelle: "", encaisseur: "" });
            setTelephone("");
            setEnvoi({ statut: "saisie" });
            setAnnonce("");
            viser(idChamp("ref"));
          }}
        />
      )}
    </div>
  );
}

type PropsLien = {
  lien: LienGenere;
  associe: string;
  /** Numéro international du client, s'il a été saisi et reconnu. */
  telephone: string | null;
  onNouveau: () => void;
};

/** Lien généré : récapitulatif, lien complet, copie et envoi. */
function LienPret({ lien, associe, telephone, onNouveau }: PropsLien) {
  const champ = useRef<HTMLTextAreaElement>(null);
  const [copie, setCopie] = useState("");
  const message = messageLienPaiement(lien);
  const bouton = classesBouton("secondaire", "md", "w-full sm:w-auto");

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(lien.url);
      setCopie("Lien copié. Collez-le dans votre message.");
    } catch {
      // Presse-papiers refusé (navigateur, réglages) : le lien est sélectionné pour une copie à la main.
      champ.current?.focus();
      champ.current?.select();
      setCopie("Copie automatique refusée par le navigateur : le lien est sélectionné, copiez-le avec le menu.");
    }
  };

  return (
    <section aria-labelledby={ID_RESULTAT} className="mt-10 rounded-carte border border-bord-champ bg-blanc p-5 sm:p-8">
      <h2 id={ID_RESULTAT} tabIndex={-1} className="text-2xl font-bold leading-tight">
        Lien prêt à envoyer
      </h2>

      <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-doux">Référence</dt>
        <dd className="font-semibold">{lien.ref}</dd>
        <dt className="text-doux">Prestation</dt>
        <dd className="font-semibold [overflow-wrap:anywhere]">{lien.libelle}</dd>
        <dt className="text-doux">Montant</dt>
        <dd className="font-semibold">{formaterEuros(lien.centimes)}</dd>
        <dt className="text-doux">Encaisse</dt>
        <dd className="font-semibold [overflow-wrap:anywhere]">
          {lien.encaisseur} · {associe}
        </dd>
        <dt className="text-doux">Valable jusqu&apos;au</dt>
        <dd className="font-semibold">{formaterDateHeureParis(new Date(lien.expireLe))}</dd>
      </dl>

      <label htmlFor="url-lien" className="mt-6 block font-semibold">
        Lien de paiement
      </label>
      <textarea
        ref={champ}
        id="url-lien"
        readOnly
        rows={5}
        value={lien.url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full resize-none break-all rounded-xl border border-bord-champ bg-ecume p-3 font-mono text-sm text-texte"
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Bouton onClick={() => void copier()} className="w-full sm:w-auto">
          Copier le lien
        </Bouton>
        <a href={lienWhatsAppPaiement(message, telephone)} target="_blank" rel="noopener noreferrer" className={bouton}>
          <IconeMessage className="size-5" />
          Envoyer par WhatsApp
        </a>
        <a href={lienSmsPaiement(message, telephone)} className={bouton}>
          Envoyer par SMS
        </a>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-accent">
        {copie}
      </p>

      {/* L'URL, longue et sans espace, doit pouvoir se couper n'importe où (375 px). */}
      <p className="mt-4 text-sm text-doux [overflow-wrap:anywhere]">
        Message proposé{telephone ? "" : " (vous choisirez le contact dans l'application)"} : « {message} »
      </p>
      <p className="mt-2 text-sm text-doux">
        Le lien expire au bout de {VALIDITE_LIEN_JOURS} jours.{" "}
        <a href={lien.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4">
          Vérifier la page de paiement
        </a>
      </p>

      <Bouton variante="secondaire" onClick={onNouveau} className="mt-6 w-full sm:w-auto">
        Préparer un autre lien
      </Bouton>
    </section>
  );
}
