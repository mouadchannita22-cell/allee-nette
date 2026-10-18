import { site } from "@/config/site";
import { LiensContact } from "./LiensContact";

/**
 * Ce qu'affiche la page /reserver avant le formulaire, qui se construit dans
 * le navigateur : un court message de chargement, ou, sans JavaScript, nos
 * contacts pour réserver autrement.
 */
export function ChargementReservation() {
  return (
    // Hauteur réservée proche de celle du formulaire (étape 1), mesurée à 412, 768 et 1280 px :
    // sans elle, le pied de page remonte puis redescend à l'arrivée du formulaire (CLS 0,41).
    <div className="min-h-[118rem] md:min-h-[100rem] lg:min-h-[68rem] [@media(scripting:none)]:min-h-0">
      <p
        role="status"
        className="rounded-carte border border-bord-champ bg-blanc p-6 text-doux [@media(scripting:none)]:hidden"
      >
        Chargement du formulaire de réservation…
      </p>
      <noscript>
        <div className="rounded-carte border-2 border-avertissement bg-blanc p-6">
          <h2 className="font-sans text-xl font-bold tracking-normal">Le formulaire a besoin de JavaScript</h2>
          <p className="mt-2 text-doux">
            JavaScript est désactivé dans votre navigateur. Réservez par téléphone, sur WhatsApp ou par e-mail : nous
            vous confirmons le prix ferme sur vos photos, comme en ligne.
          </p>
          <LiensContact
            className="mt-5"
            messageWhatsApp={`Bonjour ${site.nom}, je souhaite réserver un nettoyage de ma voiture.`}
          />
        </div>
      </noscript>
    </div>
  );
}
