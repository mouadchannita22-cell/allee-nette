/**
 * Libellés communs au paiement en ligne (Stripe, PayPal, e-mails aux
 * associés). Fonctions pures, sans secret.
 */
import { site } from "@/config/site";

/** Ligne du paiement : « Allée Nette — Le Complet M — réf. AN-2026-0142 ». */
export function libelleLigne(lien: { libelle: string; ref: string }): string {
  return `${site.nom} — ${lien.libelle} — réf. ${lien.ref}`;
}

/** Noms des moyens de paiement Stripe les plus courants (type du PaymentIntent). */
const MOYENS: Record<string, string> = {
  card: "Carte bancaire",
  paypal: "PayPal",
  link: "Link (Stripe)",
  sepa_debit: "Prélèvement SEPA",
  bancontact: "Bancontact",
  ideal: "iDEAL",
  klarna: "Klarna",
  revolut_pay: "Revolut Pay",
  amazon_pay: "Amazon Pay",
};

const PORTEFEUILLES: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  samsung_pay: "Samsung Pay",
  link: "Link",
};

/**
 * Moyen de paiement lisible : « Carte bancaire via Apple Pay (card) »,
 * « PayPal (paypal) ». Le type technique reste entre parenthèses pour le
 * retrouver dans le tableau de bord Stripe.
 */
export function libelleMoyen(type: string | null | undefined, portefeuille?: string | null): string {
  if (!type) return "Non précisé (voir le tableau de bord Stripe)";
  const nom = MOYENS[type] ?? type;
  const via = portefeuille ? ` via ${PORTEFEUILLES[portefeuille] ?? portefeuille}` : "";
  return `${nom}${via} (${type})`;
}
