"use client";

import { useEffect, useRef, useState } from "react";
import { VerificateurCommune } from "@/components/tarifs/VerificateurCommune";
import { CarteZones, type DonneesCarte } from "./CarteZones";
import { apresChargement } from "./useModeEffets";

/**
 * Carte et champ « Votre commune » liés : la commune trouvée s'allume sur la
 * carte. Les contours (public/carte-zone.json, une trentaine de Ko) arrivent
 * après l'affichage de la page : ils ne retardent ni le texte ni le champ.
 */
export function ZonesInteractives() {
  const conteneur = useRef<HTMLDivElement>(null);
  const [carte, setCarte] = useState<DonneesCarte | null>(null);
  const [insee, setInsee] = useState<string | null>(null);

  useEffect(() => {
    const controleur = new AbortController();
    const annuler = apresChargement(() => {
      fetch("/carte-zone.json", { signal: controleur.signal })
        .then((r) => (r.ok ? (r.json() as Promise<DonneesCarte>) : null))
        .then((donnees) => setCarte(donnees))
        .catch(() => {});
    });
    return () => {
      annuler();
      controleur.abort();
    };
  }, []);

  useEffect(() => {
    const chemin = insee ? conteneur.current?.querySelector(`path[data-insee="${insee}"]`) : null;
    chemin?.classList.add("choisie");
    return () => chemin?.classList.remove("choisie");
  }, [insee, carte]);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div ref={conteneur}>
        <CarteZones carte={carte} />
      </div>
      <div className="rounded-carte border border-aqua/30 bg-texte/[0.03] p-6 sm:p-8 lg:mt-10">
        <h2 id="titre-verifier" className="sr-only">
          Vérifier votre commune
        </h2>
        <VerificateurCommune onCommune={(c) => setInsee(c?.insee ?? null)} />
      </div>
    </div>
  );
}
