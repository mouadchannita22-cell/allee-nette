/**
 * Numéros de téléphone saisis par les clients : français (« 06 12 34 56 78 »)
 * ou internationaux (« +32 470 12 34 56 », « 0032… »), normalisés au format
 * international E.164 (« +33612345678 »). Fonctions pures.
 */

/** Numéro normalisé (« +33612345678 »), ou `null` s'il n'est pas valable. */
export function normaliserTelephone(saisie: string): string | null {
  const texte = saisie.trim();
  if (!/^\+?[\d\s().\-/]+$/.test(texte)) return null;
  let numero = texte.replace(/[\s().\-/]/g, "");
  if (numero.startsWith("00")) numero = `+${numero.slice(2)}`;
  // Numéro français à 10 chiffres.
  if (/^0[1-9]\d{8}$/.test(numero)) return `+33${numero.slice(1)}`;
  if (numero.startsWith("+33")) {
    // « +33 (0)6 12 34 56 78 » : le 0 entre parenthèses est en trop.
    const national = numero.length === 13 && numero[3] === "0" ? numero.slice(4) : numero.slice(3);
    return /^[1-9]\d{8}$/.test(national) ? `+33${national}` : null;
  }
  return /^\+[1-9]\d{7,14}$/.test(numero) ? numero : null;
}

/** « +33612345678 » → « 06 12 34 56 78 » ; les autres numéros restent au format international. */
export function formaterTelephone(numero: string): string {
  const m = /^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(numero);
  return m ? `0${m.slice(1).join(" ")}` : numero;
}

/** Numéro pour un lien wa.me : chiffres seulement, indicatif compris (« 33612345678 »). */
export function numeroWhatsApp(numero: string): string | null {
  const normalise = normaliserTelephone(numero);
  return normalise ? normalise.slice(1) : null;
}
