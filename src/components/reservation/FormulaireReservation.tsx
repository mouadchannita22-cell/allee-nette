"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { site } from "@/config/site";
import { formule as trouverFormule, type FormuleId } from "@/data/offres";
import {
  BOUTON_ENVOI,
  ETAPES_RESERVATION,
  PHOTOS_DEMANDEES,
  type NumeroEtape,
  type PhotoId,
} from "@/data/reservation";
import { suivre } from "@/lib/analytics";
import { devinerGabarit } from "@/lib/gabarit";
import { basculerOption } from "@/lib/prix";
import { etapeDuChamp, idChamp } from "@/lib/reservation/champs";
import { creneauxDisponibles } from "@/lib/reservation/creneaux";
import { devisReservation, effetDuCode } from "@/lib/reservation/devis";
import type { DonneesFormulaire, ErreursChamps } from "@/lib/reservation/formulaire";
import {
  changerFormule,
  modifierOptions,
  modifierReponses,
  nouvelleVoiture,
  type VoitureFormulaire,
} from "@/lib/reservation/voiture";
import { trouverCommune } from "@/lib/zones";
import type { EtatCommune } from "@/components/tarifs/ChampCommune";
import { Bouton } from "@/components/ui/Bouton";
import { compresserPhoto } from "./compression";
import { EtapeCoordonnees } from "./EtapeCoordonnees";
import { EtapeCreneaux } from "./EtapeCreneaux";
import { EtapeFormule } from "./EtapeFormule";
import { EtapeLieu } from "./EtapeLieu";
import { EtapePhotosPaiement, PHOTOS_VIDES, type EtatPhoto, type PhotosFormulaire } from "./EtapePhotosPaiement";
import { EtapeValidation } from "./EtapeValidation";
import { EtapeVoiture, ID_AJOUTER_VOITURE } from "./EtapeVoiture";
import { BarreActions, PanneauEstimation } from "./Estimation";
import { LiensContact } from "./LiensContact";
import { PastilleErreur } from "./Champs";
import { Progression } from "./Progression";
import { Recapitulatif } from "./Recapitulatif";
import { ResumeErreurs } from "./ResumeErreurs";

type Props = {
  /** Formulaire de départ, prérempli depuis l'URL du calculateur. */
  initial: DonneesFormulaire;
};

type EtatEnvoi =
  | { statut: "repos" }
  | { statut: "envoi" }
  | { statut: "envoyee" }
  | { statut: "erreur"; message: string; champs?: ErreursChamps };

/** Vérification des réponses (schéma Zod, partagé avec le serveur). */
type Verification = typeof import("@/lib/reservation/schema");

/**
 * Le schéma et Zod sont chargés à part, juste après l'affichage : ils ne
 * pèsent rien dans le JavaScript initial de la page.
 */
const chargerVerification = () => import("@/lib/reservation/schema");

/** Élément qui doit recevoir le focus après le rendu ; `haut` : revenir en haut du formulaire. */
type DemandeFocus = { id: string; haut: boolean; n: number };

const ID_TITRE = "titre-etape";
const ID_RESUME = "resume-erreurs";
const ID_ESTIMATION = "estimation";
const ID_ERREUR_ENVOI = "erreur-envoi";
const ID_FORMULAIRE = "formulaire-reservation";
const NOMBRE_ETAPES = ETAPES_RESERVATION.length as NumeroEtape;

const MESSAGE_HORS_LIGNE =
  "Votre demande n'a pas pu partir : la connexion semble coupée. Vérifiez-la, puis renvoyez votre demande, ou contactez-nous.";

function etatCommune(saisie: string): EtatCommune {
  const commune = saisie ? trouverCommune(saisie) : null;
  return { saisie, commune, inconnue: Boolean(saisie && !commune) };
}

/** Erreurs relevées au dernier essai, encore valables (les champs corrigés disparaissent). */
function erreursRestantes(tentative: ErreursChamps | undefined, actuelles: ErreursChamps): ErreursChamps {
  if (!tentative) return {};
  return Object.fromEntries(Object.keys(tentative).flatMap((cle) => (cle in actuelles ? [[cle, actuelles[cle]!]] : [])));
}

/**
 * Formulaire de réservation en sept étapes (partie 9 du brief). L'état vit
 * dans la mémoire de React uniquement : rien n'est écrit dans le navigateur.
 * Chaque étape est vérifiée avant la suivante ; le total estimé reste visible.
 */
export function FormulaireReservation({ initial }: Props) {
  const [donnees, setDonnees] = useState(initial);
  const [commune, setCommune] = useState(() => etatCommune(initial.lieu.commune));
  const [etape, setEtape] = useState<NumeroEtape>(1);
  const [etapeMax, setEtapeMax] = useState<NumeroEtape>(1);
  const [tentatives, setTentatives] = useState<Partial<Record<NumeroEtape, ErreursChamps>>>({});
  const [focus, setFocus] = useState<DemandeFocus | null>(null);
  const [photos, setPhotos] = useState<PhotosFormulaire>(PHOTOS_VIDES);
  const [envoi, setEnvoi] = useState<EtatEnvoi>({ statut: "repos" });
  const [entame, setEntame] = useState(false);
  // Heure d'ouverture du formulaire : créneaux proposés et délai minimal de l'anti-spam.
  const [maintenant] = useState(() => new Date());
  const [verification, setVerification] = useState<Verification | null>(null);

  const etapesVues = useRef(new Set<number>());
  // Dernière compression demandée par photo : une compression plus ancienne qui finit après est ignorée.
  const compressions = useRef<Partial<Record<PhotoId, number>>>({});
  // Aperçus affichés (adresses blob:), libérés quand la photo change ou quand le formulaire disparaît.
  const apercus = useRef<Partial<Record<PhotoId, string>>>({});

  const zone = commune.commune?.zone ?? (commune.inconnue ? "hors-zone" : "zone1");
  const entree = { voitures: donnees.voitures, commune: donnees.lieu.commune, code: donnees.coordonnees.code };
  const resultat = useMemo(
    () => devisReservation({ voitures: donnees.voitures, commune: donnees.lieu.commune, code: donnees.coordonnees.code }, zone),
    [donnees.voitures, donnees.lieu.commune, donnees.coordonnees.code, zone],
  );
  const disponibles = useMemo(() => creneauxDisponibles(maintenant), [maintenant]);
  const actuelles = useMemo(
    () => (verification ? verification.erreursEtape(etape, donnees, maintenant) : {}),
    [verification, etape, donnees, maintenant],
  );
  const erreurs = erreursRestantes(tentatives[etape], actuelles);
  const photosJointes = PHOTOS_DEMANDEES.filter((p) => photos[p.id].statut === "prete").map((p) => p.libelle);
  const exterieur = donnees.voitures.some((v) => trouverFormule(v.formule).avecExterieur || Boolean(v.options["exterieur-seul"]));

  // -------------------------------------------------------------------------
  // Effets : mesure, focus, avertissement avant de quitter, aperçus
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (etapesVues.current.has(etape)) return;
    etapesVues.current.add(etape);
    suivre(`reservation_etape_${etape}`);
  }, [etape]);

  // Chargement du schéma quand le navigateur est au repos, avant le premier « Continuer ».
  useEffect(() => {
    let actif = true;
    const charger = () => {
      chargerVerification().then(
        (charge) => actif && setVerification(charge),
        () => {
          // Réseau coupé : nouvel essai au moment de vérifier.
        },
      );
    };
    const repos = "requestIdleCallback" in window ? window.requestIdleCallback(charger, { timeout: 2000 }) : null;
    const minuteur = repos === null ? window.setTimeout(charger, 500) : null;
    return () => {
      actif = false;
      if (repos !== null) window.cancelIdleCallback(repos);
      if (minuteur !== null) window.clearTimeout(minuteur);
    };
  }, []);

  useEffect(() => {
    if (!focus) return;
    if (focus.haut) document.getElementById(ID_FORMULAIRE)?.scrollIntoView({ block: "start" });
    document.getElementById(focus.id)?.focus({ preventScroll: focus.haut });
  }, [focus]);

  // Mobile : un champ qui reçoit le focus ne reste pas, même en partie, sous la barre du bas.
  useEffect(() => {
    const formulaire = document.getElementById(ID_FORMULAIRE);
    const barre = formulaire?.querySelector<HTMLElement>("[data-barre-estimation]");
    if (!formulaire || !barre) return;
    const degager = (e: FocusEvent) => {
      const cible = e.target;
      if (!(cible instanceof HTMLElement) || barre.contains(cible) || getComputedStyle(barre).position !== "sticky") return;
      // Bouton radio masqué : c'est sa carte qui compte.
      const zone = cible.classList.contains("sr-only") ? (cible.closest("label") ?? cible) : cible;
      const a = zone.getBoundingClientRect();
      const b = barre.getBoundingClientRect();
      // Liste de suggestions (commune) : de la place en dessous, sans passer le champ sous l'en-tête.
      const place = cible.getAttribute("role") === "combobox" ? 300 : 0;
      const depasse = a.bottom + place + 12 - b.top;
      if (depasse > 0) window.scrollBy({ top: Math.min(depasse, Math.max(a.top - 96, a.bottom + 12 - b.top)) });
    };
    formulaire.addEventListener("focusin", degager);
    return () => formulaire.removeEventListener("focusin", degager);
  }, []);

  const proteger = entame && envoi.statut !== "envoyee";
  useEffect(() => {
    if (!proteger) return;
    const avertir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [proteger]);

  useEffect(() => {
    const parPhoto = apercus.current;
    return () => Object.values(parPhoto).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // -------------------------------------------------------------------------
  // Modifications
  // -------------------------------------------------------------------------

  const viser = (id: string, haut = false) => setFocus((f) => ({ id, haut, n: (f?.n ?? 0) + 1 }));

  const modifier = (maj: (d: DonneesFormulaire) => DonneesFormulaire) => {
    setEntame(true);
    setDonnees(maj);
    if (envoi.statut === "erreur") setEnvoi({ statut: "repos" });
  };

  const modifierVoiture = (i: number, maj: (v: VoitureFormulaire) => VoitureFormulaire) =>
    modifier((d) => ({ ...d, voitures: d.voitures.map((v, j) => (j === i ? maj(v) : v)) }));

  /** Modèle saisi : un modèle nouvellement reconnu choisit le gabarit (que le client peut changer). */
  const changerModele = (i: number, modele: string) =>
    modifierVoiture(i, (v) => {
      const avant = devinerGabarit(v.modele);
      const apres = devinerGabarit(modele);
      return { ...v, modele, gabarit: apres && apres.modele !== avant?.modele ? apres.gabarit : v.gabarit };
    });

  const changerCommune = (etat: EtatCommune) => {
    setCommune(etat);
    modifier((d) => ({ ...d, lieu: { ...d.lieu, commune: etat.commune?.nom ?? etat.saisie } }));
  };

  /** Zone 2 avec L'Intérieur Net seul : la première voiture passe à la formule proposée. */
  const basculer = (f: FormuleId) => modifierVoiture(0, (v) => changerFormule(v, f));

  /** Remplace l'état d'une photo et libère l'aperçu précédent. */
  const remplacerPhoto = (id: PhotoId, etat: EtatPhoto) => {
    const ancien = apercus.current[id];
    if (ancien && (etat.statut !== "prete" || etat.apercu !== ancien)) {
      delete apercus.current[id];
      // Libéré après le rendu qui retire l'image de la page.
      setTimeout(() => URL.revokeObjectURL(ancien), 0);
    }
    if (etat.statut === "prete") apercus.current[id] = etat.apercu;
    setPhotos((actuelles) => ({ ...actuelles, [id]: etat }));
  };

  const choisirPhoto = async (id: PhotoId, fichier: File) => {
    setEntame(true);
    const jeton = (compressions.current[id] ?? 0) + 1;
    compressions.current[id] = jeton;
    remplacerPhoto(id, { statut: "compression" });
    const r = await compresserPhoto(fichier);
    if (compressions.current[id] !== jeton) return;
    remplacerPhoto(id, r.ok ? { statut: "prete", photo: r.photo, apercu: URL.createObjectURL(r.photo) } : { statut: "erreur", message: r.message });
  };

  const retirerPhoto = (id: PhotoId) => {
    compressions.current[id] = (compressions.current[id] ?? 0) + 1;
    remplacerPhoto(id, { statut: "vide" });
  };

  // -------------------------------------------------------------------------
  // Navigation entre les étapes
  // -------------------------------------------------------------------------

  const aller = (n: NumeroEtape) => {
    setEtape(n);
    setEtapeMax((m) => (n > m ? n : m));
    viser(ID_TITRE, true);
  };

  /** Schéma déjà chargé, ou chargé maintenant ; `null` si le réseau ne répond pas. */
  const obtenirVerification = async (): Promise<Verification | null> => {
    if (verification) return verification;
    try {
      const charge = await chargerVerification();
      setVerification(charge);
      return charge;
    } catch {
      setEnvoi({ statut: "erreur", message: MESSAGE_HORS_LIGNE });
      viser(ID_ERREUR_ENVOI);
      return null;
    }
  };

  /** Vérifie l'étape ; en cas d'erreur, le résumé apparaît et reçoit le focus. */
  const verifier = async (n: NumeroEtape): Promise<boolean> => {
    const v = await obtenirVerification();
    if (!v) return false;
    const trouvees = v.erreursEtape(n, donnees, maintenant);
    const ok = Object.keys(trouvees).length === 0;
    setTentatives((t) => ({ ...t, [n]: ok ? undefined : trouvees }));
    if (!ok) viser(ID_RESUME);
    return ok;
  };

  const continuer = async () => {
    if (etape < NOMBRE_ETAPES && (await verifier(etape))) aller((etape + 1) as NumeroEtape);
  };

  const revenirAuRecapitulatif = async () => {
    if (await verifier(etape)) aller(NOMBRE_ETAPES);
  };

  const soumettre = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (etape < NOMBRE_ETAPES) void continuer();
    else void verifier(etape);
  };

  // -------------------------------------------------------------------------
  // Rendu
  // -------------------------------------------------------------------------

  const prefixe = (cle: string) => {
    const voiture = /^voitures\.(\d+)\./.exec(cle);
    return voiture && donnees.voitures.length > 1 ? `Voiture ${Number(voiture[1]) + 1} : ` : "";
  };

  const enEnvoi = envoi.statut === "envoi" || envoi.statut === "envoyee";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start xl:gap-12">
      <div id={ID_FORMULAIRE} className="min-w-0">
        <form noValidate onSubmit={soumettre} aria-labelledby={ID_TITRE}>
          <Progression etape={etape} etapeMax={etapeMax} onAller={aller} />

          <h2 id={ID_TITRE} tabIndex={-1} className="mt-6 text-2xl font-bold leading-tight md:text-3xl">
            {ETAPES_RESERVATION[etape - 1]}
          </h2>

          <ResumeErreurs id={ID_RESUME} erreurs={erreurs} prefixe={prefixe} repli={ID_TITRE} />

          <div className="mt-6">
            {etape === 1 && (
              <EtapeVoiture
                voitures={donnees.voitures}
                erreurs={erreurs}
                onModele={changerModele}
                onModifier={(i, maj) =>
                  modifierVoiture(i, (v) => {
                    const { gabarit, ...reponses } = maj;
                    return modifierReponses(gabarit ? { ...v, gabarit } : v, reponses);
                  })
                }
                onAjouter={() => {
                  const n = donnees.voitures.length;
                  modifier((d) => ({ ...d, voitures: [...d.voitures, nouvelleVoiture()] }));
                  viser(idChamp(`voitures.${n}.modele`));
                }}
                onRetirer={(i) => {
                  modifier((d) => ({ ...d, voitures: d.voitures.filter((_, j) => j !== i) }));
                  viser(ID_AJOUTER_VOITURE);
                }}
              />
            )}
            {etape === 2 && (
              <EtapeFormule
                voitures={donnees.voitures}
                erreurs={erreurs}
                onFormule={(i, f) => modifierVoiture(i, (v) => changerFormule(v, f))}
                onAbonnement={(i, abonnement) => modifierVoiture(i, (v) => ({ ...v, abonnement }))}
                onOption={(i, option, q) => modifierVoiture(i, (v) => modifierOptions(v, basculerOption(v.options, option, q)))}
              />
            )}
            {etape === 3 && (
              <EtapeLieu
                lieu={donnees.lieu}
                commune={commune}
                zone={zone}
                resultat={resultat}
                exterieur={exterieur}
                erreurs={erreurs}
                onAdresse={(adresse) => modifier((d) => ({ ...d, lieu: { ...d.lieu, adresse } }))}
                onCommune={changerCommune}
                onEmplacement={(emplacement) => modifier((d) => ({ ...d, lieu: { ...d.lieu, emplacement } }))}
                onPrise={(prise) => modifier((d) => ({ ...d, lieu: { ...d.lieu, prise } }))}
                onBasculer={basculer}
              />
            )}
            {etape === 4 && (
              <EtapeCreneaux
                disponibles={disponibles}
                choisis={donnees.creneaux}
                erreurs={erreurs}
                onChoisir={(rang, creneau) =>
                  modifier((d) => ({ ...d, creneaux: d.creneaux.map((c, k) => (k === rang ? creneau : c)) }))
                }
              />
            )}
            {etape === 5 && (
              <EtapeCoordonnees
                coordonnees={donnees.coordonnees}
                effetCode={effetDuCode(entree, zone)}
                erreurs={erreurs}
                onModifier={(maj) => modifier((d) => ({ ...d, coordonnees: { ...d.coordonnees, ...maj } }))}
              />
            )}
            {etape === 6 && (
              <EtapePhotosPaiement
                photos={photos}
                paiement={donnees.paiement}
                erreurs={erreurs}
                onChoisirPhoto={(id, fichier) => void choisirPhoto(id, fichier)}
                onRetirerPhoto={retirerPhoto}
                onPaiement={(paiement) => modifier((d) => ({ ...d, paiement }))}
              />
            )}
            {etape === 7 && (
              <EtapeValidation
                validation={donnees.validation}
                erreurs={erreurs}
                onCocher={(cle, coche) => modifier((d) => ({ ...d, validation: { ...d.validation, [cle]: coche } }))}
                recapitulatif={
                  <Recapitulatif donnees={donnees} zone={zone} resultat={resultat} photos={photosJointes} onModifier={aller} />
                }
              />
            )}
          </div>

          {envoi.statut === "erreur" && (
            <div id={ID_ERREUR_ENVOI} tabIndex={-1} role="alert" className="mt-6 rounded-2xl border-2 border-avertissement bg-blanc p-5">
              <p className="flex gap-2 font-semibold text-avertissement">
                <PastilleErreur />
                <span>{envoi.message}</span>
              </p>
              {envoi.champs && Object.keys(envoi.champs).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {Object.entries(envoi.champs).map(([cle, message]) => (
                    <li key={cle}>
                      {message}{" "}
                      <button
                        type="button"
                        onClick={() => aller(etapeDuChamp(cle))}
                        className="min-h-11 font-semibold text-accent underline underline-offset-4"
                      >
                        Modifier<span className="sr-only"> : {ETAPES_RESERVATION[etapeDuChamp(cle) - 1]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <LiensContact className="mt-4" messageWhatsApp={`Bonjour ${site.nom}, je n'arrive pas à envoyer ma demande de réservation sur le site.`} />
            </div>
          )}

          {etapeMax === NOMBRE_ETAPES && etape < NOMBRE_ETAPES && (
            <Bouton variante="secondaire" onClick={() => void revenirAuRecapitulatif()} className="mt-8 w-full sm:w-auto">
              Revenir au récapitulatif
            </Bouton>
          )}
          <p aria-live="polite" className="sr-only">
            {envoi.statut === "envoi" ? "Envoi de votre demande en cours." : ""}
          </p>

          <BarreActions resultat={resultat} cible={ID_ESTIMATION}>
            {etape > 1 && (
              <Bouton variante="secondaire" onClick={() => aller((etape - 1) as NumeroEtape)} disabled={enEnvoi}>
                Retour
              </Bouton>
            )}
            <Bouton type="submit" className="min-w-0 flex-1 lg:flex-none lg:px-10" aria-disabled={enEnvoi || undefined}>
              {etape < NOMBRE_ETAPES ? "Continuer" : enEnvoi ? "Envoi en cours…" : BOUTON_ENVOI}
            </Bouton>
          </BarreActions>
        </form>
      </div>

      <PanneauEstimation id={ID_ESTIMATION} resultat={resultat} communeRenseignee={Boolean(commune.commune) || commune.inconnue} onBasculer={basculer} />
    </div>
  );
}
