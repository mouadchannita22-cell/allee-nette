import Link from "next/link";
import { zoneActive } from "@/config/site";
import { DEPLACEMENT } from "@/data/offres";
import { VerificateurCommune } from "@/components/tarifs/VerificateurCommune";
import { IconeFleche } from "@/components/ui/Icones";
import { EnTeteSection } from "./EnTetes";

/** Résumé des zones pour l'accueil. La carte animée arrive à l'étape des effets. */
export function ZonesResume() {
  return (
    <section className="theme-sombre relative z-10 py-24 md:py-32" aria-labelledby="titre-zones">
      <div className="conteneur grid gap-12 lg:grid-cols-2">
        <div>
          <EnTeteSection
            id="titre-zones"
            surtitre="Zones d'intervention"
            titre={`${zoneActive.ville} et ${zoneActive.rayons.zone2} km alentour.`}
            intro={`Déplacement inclus jusqu'à ${zoneActive.rayons.zone1} km, +${DEPLACEMENT.zone2.supplement} € jusqu'à ${zoneActive.rayons.zone2} km. Au-delà, sur demande.`}
          />
          <p className="mt-6 text-sm text-doux">
            <span className="font-semibold text-texte">Zone 1 :</span> {zoneActive.zone1.map((c) => c.nom).join(", ")}.
          </p>
          <Link href="/zones" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline">
            Toutes les communes desservies <IconeFleche className="size-4" />
          </Link>
        </div>
        <div className="self-center rounded-carte border border-bord bg-texte/[0.03] p-6 sm:p-8">
          <VerificateurCommune />
        </div>
      </div>
    </section>
  );
}
