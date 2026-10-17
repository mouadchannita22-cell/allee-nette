import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Unbounded } from "next/font/google";
import { site } from "@/config/site";
import { lienTelephone, lienWhatsApp } from "@/lib/contact";
import { descriptionAccueil, estProduction, titreAccueil } from "@/lib/seo";
import { EnTete } from "@/components/layout/EnTete";
import { PiedDePage } from "@/components/layout/PiedDePage";
import { BarreMobile } from "@/components/layout/BarreMobile";
import { CaptureSource } from "@/components/layout/CaptureSource";
import { MesureAudience } from "@/components/layout/MesureAudience";
import { JsonLd } from "@/components/seo/JsonLd";
import { MicroInteractions } from "@/components/fx/MicroInteractions";
import { donneesEntreprise } from "@/lib/donnees-structurees";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: titreAccueil, template: `%s | ${site.nom}` },
  description: descriptionAccueil,
  applicationName: site.nom,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.nom,
    title: titreAccueil,
    description: descriptionAccueil,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: estProduction ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const whatsapp = lienWhatsApp("Bonjour Allée Nette, je souhaite un nettoyage de ma voiture.");

  return (
    <html lang="fr" className={`${unbounded.variable} ${jakarta.variable}`}>
      <body className="flex min-h-dvh flex-col pb-[calc(var(--hauteur-barre-mobile)+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#contenu"
          className="fixed left-3 top-3 z-[70] -translate-y-24 rounded-full bg-aqua px-5 py-3 font-semibold text-nuit transition-transform focus:translate-y-0"
        >
          Aller au contenu
        </a>
        <JsonLd donnees={donneesEntreprise()} />
        <EnTete />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <PiedDePage />
        <BarreMobile telephone={lienTelephone()} whatsapp={whatsapp} />
        <CaptureSource />
        <MicroInteractions />
        <MesureAudience />
      </body>
    </html>
  );
}
