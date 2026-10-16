import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site, zoneActive } from "@/config/site";
import { prixMinimum } from "@/data/offres";

export const alt = `${site.nom} — ${site.promesse}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const dossier = join(process.cwd(), "assets/polices");
const [unbounded, jakarta, logo] = await Promise.all([
  readFile(join(dossier, "Unbounded-700.ttf")),
  readFile(join(dossier, "PlusJakartaSans-700.ttf")),
  readFile(join(process.cwd(), "public/logos/allee-nette-sombre.svg")),
]);
const logoDataUri = `data:image/svg+xml;base64,${logo.toString("base64")}`;

/** Image de partage générée au build (réseaux sociaux, messageries). */
export default async function ImagePartage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#F3FAFC",
          backgroundColor: "#0B1220",
          backgroundImage:
            "radial-gradient(900px 520px at 85% 15%, rgba(46,230,214,0.28), transparent 60%), radial-gradient(700px 420px at 0% 100%, #0F2A4A, transparent 70%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri} alt="" width={420} height={62} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Unbounded", fontSize: 68, lineHeight: 1.05, maxWidth: 980 }}>{site.promesse}</div>
          <div style={{ fontFamily: "Jakarta", fontSize: 30, marginTop: 28, color: "#9AA8BA" }}>
            {`Nettoyage auto à domicile · ${zoneActive.ville} et alentours · dès ${prixMinimum()} €`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Unbounded", data: unbounded, style: "normal", weight: 700 },
        { name: "Jakarta", data: jakarta, style: "normal", weight: 700 },
      ],
    },
  );
}
