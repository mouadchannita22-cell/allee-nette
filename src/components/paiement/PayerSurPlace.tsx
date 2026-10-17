import { PAIEMENT_SUR_PLACE } from "@/data/conditions";
import { DETAILS_PAIEMENT_SUR_PLACE, FACTURE_SUR_PLACE } from "@/data/paiement";
import { fr } from "@/lib/typo";

/** Bloc « Payer sur place après la prestation » (partie 10.3 du brief). */
export function PayerSurPlace({ titre = "Payer sur place après la prestation" }: { titre?: string }) {
  return (
    <section aria-labelledby="titre-sur-place" className="rounded-carte border border-bord-champ bg-blanc p-6">
      <h2 id="titre-sur-place" className="font-sans text-lg font-bold tracking-normal">
        {titre}
      </h2>
      <p className="mt-2 text-doux">{fr("Vous préférez régler le jour du rendez-vous ? C'est possible, une fois la prestation terminée :")}</p>
      <ul className="mt-3 space-y-2">
        {PAIEMENT_SUR_PLACE.map((moyen) => (
          <li key={moyen} className="flex gap-3">
            <span aria-hidden="true" className="font-bold text-accent">
              ✓
            </span>
            {fr(DETAILS_PAIEMENT_SUR_PLACE[moyen])}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-doux">{fr(FACTURE_SUR_PLACE)}</p>
    </section>
  );
}
