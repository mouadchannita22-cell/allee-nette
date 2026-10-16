/**
 * Transmet une estimation du calculateur au formulaire de réservation
 * par l'URL : /reserver?f=complet&g=M&o=siege-enfant:2&c=Saintes…
 * Aucune donnée n'est stockée ; les valeurs invalides sont ignorées.
 */
import { CODES_GABARIT, FORMULES, OPTIONS, type FormuleId, type Gabarit, type OptionId } from "@/data/offres";
import type { SelectionOptions, Vehicule } from "./prix";

export type EtatCalculateur = {
  vehicules: Vehicule[];
  commune: string;
  code: string;
};

export const ETAT_INITIAL: EtatCalculateur = {
  vehicules: [{ formule: "complet", gabarit: "M", options: {} }],
  commune: "",
  code: "",
};

const MAX_VEHICULES = 3;

function encoderOptions(options: SelectionOptions = {}): string {
  return Object.entries(options)
    .filter(([, q]) => q && q > 0)
    .map(([id, q]) => (q === 1 ? id : `${id}:${q}`))
    .join(",");
}

function decoderOptions(texte: string | null): SelectionOptions {
  const options: SelectionOptions = {};
  for (const morceau of (texte ?? "").split(",")) {
    const [id, q] = morceau.split(":");
    if (!OPTIONS.some((o) => o.id === id)) continue;
    const quantite = q === undefined ? 1 : Number.parseInt(q, 10);
    if (Number.isInteger(quantite) && quantite > 0 && quantite <= 10) options[id as OptionId] = quantite;
  }
  return options;
}

/** État du calculateur → paramètres d'URL. Voiture 1 : f, g, o, ab ; voiture 2 : f2, g2, o2, ab2… */
export function versParametres(etat: EtatCalculateur): URLSearchParams {
  const p = new URLSearchParams();
  etat.vehicules.slice(0, MAX_VEHICULES).forEach((v, i) => {
    const s = i === 0 ? "" : String(i + 1);
    p.set(`f${s}`, v.formule);
    p.set(`g${s}`, v.gabarit);
    const o = encoderOptions(v.options);
    if (o) p.set(`o${s}`, o);
    if (v.abonnement) p.set(`ab${s}`, "1");
  });
  if (etat.commune.trim()) p.set("c", etat.commune.trim());
  if (etat.code.trim()) p.set("code", etat.code.trim().toUpperCase());
  return p;
}

/** Paramètres d'URL → état du calculateur, en ignorant ce qui n'est pas valide. */
export function depuisParametres(p: URLSearchParams): EtatCalculateur {
  const vehicules: Vehicule[] = [];
  for (let i = 0; i < MAX_VEHICULES; i++) {
    const s = i === 0 ? "" : String(i + 1);
    const formule = p.get(`f${s}`);
    const gabarit = p.get(`g${s}`);
    if (!FORMULES.some((f) => f.id === formule) || !CODES_GABARIT.includes(gabarit as Gabarit)) break;
    vehicules.push({
      formule: formule as FormuleId,
      gabarit: gabarit as Gabarit,
      options: decoderOptions(p.get(`o${s}`)),
      ...(p.get(`ab${s}`) === "1" ? { abonnement: true } : {}),
    });
  }
  return {
    vehicules: vehicules.length > 0 ? vehicules : ETAT_INITIAL.vehicules,
    commune: (p.get("c") ?? "").slice(0, 80),
    code: (p.get("code") ?? "").slice(0, 20).toUpperCase(),
  };
}
