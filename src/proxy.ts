/**
 * Proxy (anciennement middleware) : protège l'administration par
 * authentification HTTP Basic, avant tout rendu.
 *
 * Limité à /admin/… et /api/admin/… par `config.matcher`. Les pages et
 * routes protégées revérifient elles-mêmes l'en-tête Authorization
 * (défense en profondeur), avec la même fonction.
 *
 * Sur Netlify, le proxy tourne en fonction edge : lib/admin/authentification.ts
 * n'utilise que Web Crypto, disponible partout. ADMIN_PASSWORD doit donc
 * être visible des fonctions (portée Functions, en plus de Builds).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ENTETES_ADMIN, reponseRefus, verifierAuthentification } from "@/lib/admin/authentification";

export async function proxy(request: NextRequest): Promise<Response> {
  const etat = await verifierAuthentification(request.headers.get("authorization"), process.env.ADMIN_PASSWORD);
  if (etat !== "autorise") {
    return reponseRefus(etat, request.nextUrl.pathname.startsWith("/api/") ? "json" : "texte");
  }
  const reponse = NextResponse.next();
  for (const [cle, valeur] of Object.entries(ENTETES_ADMIN)) reponse.headers.set(cle, valeur);
  return reponse;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
