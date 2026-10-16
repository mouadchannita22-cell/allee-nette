"use client";

import { useEffect } from "react";
import { capterSourceVisite } from "@/lib/source-visite";

/**
 * Capte la source de la visite (paramètres UTM, code, site d'origine) à la
 * première page vue, en mémoire seulement : elle part avec une éventuelle
 * demande de réservation. Monté une fois, dans le layout.
 */
export function CaptureSource() {
  useEffect(() => {
    capterSourceVisite();
  }, []);
  return null;
}
