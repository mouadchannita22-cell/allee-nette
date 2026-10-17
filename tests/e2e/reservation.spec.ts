import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { MESSAGE_ZONE_2 } from "@/lib/prix";

/**
 * Réservation (/reserver), en mode démonstration : aucun e-mail ne part.
 * Projets « mobile » (375 × 812, tactile) et « ordinateur » (1280 × 800).
 */

const FORMAT_REFERENCE = /AN-\d{4}-\d{4}/;

/**
 * Analyse axe-core. @axe-core/playwright est typé avec playwright-core 1.64.1,
 * @playwright/test avec sa copie 1.64.0 : même objet, types distincts.
 */
function axe(page: Page) {
  return new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]["page"] });
}

/** Aucun débordement horizontal (mobile d'abord, 375 px). */
async function sansDebordement(page: Page) {
  const { large, ecran } = await page.evaluate(() => ({
    large: document.documentElement.scrollWidth,
    ecran: window.innerWidth,
  }));
  expect(large, "débordement horizontal").toBeLessThanOrEqual(ecran);
}

async function continuer(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
}

async function attendreEtape(page: Page, nom: string) {
  await expect(page.getByRole("heading", { level: 2, name: nom })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: nom })).toBeFocused();
  await sansDebordement(page);
}

function groupe(page: Page, nom: string | RegExp) {
  return page.getByRole("radiogroup", { name: nom });
}

async function remplirVoiture(page: Page, modele = "Peugeot 3008") {
  await page.getByLabel("Modèle").fill(modele);
  await groupe(page, "État de l'habitacle").getByRole("radio", { name: "Normal" }).check();
  await groupe(page, "Des poils d'animaux ?").getByRole("radio", { name: "Non" }).check();
}

async function remplirLieu(page: Page) {
  await page.getByLabel("Adresse d'intervention").fill("12 rue des Lilas");
  await groupe(page, "Où se trouve la voiture ?").getByRole("radio", { name: "Votre allée" }).check();
  await groupe(page, /Une prise électrique/).getByRole("radio", { name: "Oui" }).check();
}

/** Photo de 3000 × 2000 px dessinée dans la page, avec un bloc EXIF contenant « GPSTEST ». */
async function photoAvecExif(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 2000;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      image.data[i] = (i * 7) % 256;
      image.data[i + 1] = Math.random() * 255;
      image.data[i + 2] = (i >> 9) % 256;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95).split(",")[1]!;
  });
  const jpeg = Buffer.from(base64, "base64");
  // Segment APP1 « Exif » minimal (en-tête TIFF, aucun champ), suivi d'un marqueur à retrouver.
  const contenu = Buffer.concat([
    Buffer.from("Exif\0\0", "binary"),
    Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    Buffer.from("GPSTEST", "ascii"),
  ]);
  const longueur = Buffer.alloc(2);
  longueur.writeUInt16BE(contenu.length + 2);
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), longueur, contenu, jpeg.subarray(2)]);
}

test.describe("réservation (partie 9 du brief)", () => {
  test("parcours complet, photo compressée, page de remerciement", async ({ page }, info) => {
    const evenements: string[] = [];
    await page.exposeFunction("noterEvenement", (nom: string) => evenements.push(nom));
    await page.addInitScript(() => {
      (window as unknown as { umami: unknown }).umami = {
        track: (nom: string) => (window as unknown as { noterEvenement: (n: string) => void }).noterEvenement(nom),
      };
    });

    // Copie du champ « donnees » envoyé (le corps multipart n'est pas lisible depuis la requête).
    await page.addInitScript(() => {
      const envoyer = window.fetch.bind(window);
      window.fetch = (entree, init) => {
        const donnees = init?.body instanceof FormData ? init.body.get("donnees") : null;
        if (typeof donnees === "string") (window as unknown as { __donneesEnvoyees: string }).__donneesEnvoyees = donnees;
        return envoyer(entree, init);
      };
    });

    await page.goto("/reserver?utm_source=affiche&utm_medium=papier");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Réservez votre nettoyage/);
    await expect(page.getByRole("heading", { level: 2, name: "Votre voiture" })).toBeVisible();
    // Une seule barre en bas d'écran : celle du formulaire.
    await expect(page.locator("[data-barre-mobile]")).toBeHidden();
    // Total estimé visible dès l'étape 1 : barre du bas sur mobile, panneau à côté sur ordinateur.
    const total =
      info.project.name === "mobile"
        ? page.locator("[data-barre-estimation]").getByRole("link", { name: /Total estimé/ })
        : page.getByRole("complementary", { name: "Votre estimation" });
    await expect(total).toBeInViewport();
    await sansDebordement(page);

    await remplirVoiture(page);
    await expect(page.getByText("Peugeot 3008 : gabarit M")).toBeVisible();
    await continuer(page);

    await attendreEtape(page, "Votre formule");
    await expect(page.getByRole("radio", { name: /Le Complet/ })).toBeChecked();
    await continuer(page);

    await attendreEtape(page, "Le lieu");
    await remplirLieu(page);
    await page.getByRole("combobox", { name: "Commune" }).fill("Sain");
    await page.getByRole("option", { name: /^Saintes 17100/ }).click();
    await expect(page.getByText("Saintes : zone 1, déplacement inclus.")).toBeVisible();
    await continuer(page);

    await attendreEtape(page, "Vos créneaux");
    const premier = page.getByLabel("Premier choix");
    const creneaux = await premier.locator("option").evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    expect(creneaux.length).toBeGreaterThan(3);
    await premier.selectOption(creneaux[0]!);
    await page.getByLabel("Deuxième choix").selectOption(creneaux[1]!);
    await continuer(page);

    await attendreEtape(page, "Vos coordonnées");
    await page.getByLabel("Prénom").fill("Camille");
    await page.getByLabel("Téléphone").fill("06 12 34 56 78");
    await page.getByLabel("E-mail").fill("camille@exemple.fr");
    await continuer(page);

    await attendreEtape(page, "Photos et paiement");
    await expect(page.getByText(/^Rien à payer maintenant\. Vous réglez/)).toBeVisible();
    const originale = await photoAvecExif(page);
    expect(originale.length).toBeGreaterThan(1024 * 1024);
    await page.locator("#photo-avant").setInputFiles({ name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: originale });
    await expect(page.getByText(/Photo prête : \d+ Ko/)).toBeVisible({ timeout: 30_000 });
    const compressee = await page.getByRole("img", { name: /Aperçu de la photo : habitacle avant/ }).evaluate(async (img) => {
      const octets = new Uint8Array(await (await fetch((img as HTMLImageElement).src)).arrayBuffer());
      const texte = new TextDecoder("latin1").decode(octets);
      return {
        taille: octets.length,
        jpeg: octets[0] === 0xff && octets[1] === 0xd8,
        exif: texte.includes("Exif") || texte.includes("GPSTEST"),
        cote: Math.max((img as HTMLImageElement).naturalWidth, (img as HTMLImageElement).naturalHeight),
      };
    });
    expect(compressee.jpeg).toBe(true);
    expect(compressee.taille).toBeLessThan(500 * 1024);
    expect(compressee.cote).toBeLessThanOrEqual(1600);
    expect(compressee.exif, "métadonnées EXIF retirées").toBe(false);
    await page.getByRole("radio", { name: /Sur place, après la prestation/ }).check();
    await continuer(page);

    await attendreEtape(page, "Validation");
    await expect(page.getByText("12 rue des Lilas")).toBeVisible();
    await expect(page.getByText("Habitacle avant", { exact: true }).last()).toBeVisible();
    for (const accord of await page.getByRole("checkbox").all()) await expect(accord).not.toBeChecked();
    await page.getByLabel(/J'accepte les conditions générales de vente/).check();
    await page.getByLabel(/Je demande que la prestation soit réalisée avant la fin du délai de rétractation/).check();
    await page.getByLabel(/J'accepte que mes données servent à traiter ma demande/).check();

    const envoi = page.waitForResponse((r) => r.url().endsWith("/api/reservation") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    const reponse = await envoi;
    expect(reponse.status()).toBe(200);
    // Source de la visite (UTM de la première page) envoyée avec la demande, reprise dans l'e-mail aux associés.
    const envoye = await page.evaluate(() => (window as unknown as { __donneesEnvoyees?: string }).__donneesEnvoyees);
    expect(JSON.parse(envoye ?? "{}").source).toEqual({ utmSource: "affiche", utmMedium: "papier" });
    expect(reponse.headers()["cache-control"]).toContain("no-store");
    const corps = await reponse.json();
    expect(corps).toMatchObject({ ok: true, demo: true });
    expect(corps.reference).toMatch(FORMAT_REFERENCE);

    await page.waitForURL(/\/reserver\/merci\?ref=AN-\d{4}-\d{4}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Demande reçue" })).toBeVisible();
    await expect(page.getByText(corps.reference, { exact: true })).toBeVisible();
    await expect(page.getByText("Demande reçue. Nous vous confirmons le prix ferme sous 2 heures.")).toBeVisible();
    await expect(page.getByText("Une prise électrique à moins de 20 m de la voiture")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Votre demande" })).toBeVisible();
    await expect(page.locator("[data-barre-mobile]")).toBeHidden();
    await sansDebordement(page);

    expect(evenements).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7].map((n) => `reservation_etape_${n}`)));
    expect(evenements).toContain("demande_envoyee");

    // Rechargement : plus de récapitulatif (rien n'est stocké), la référence reste.
    await page.reload();
    await expect(page.getByText(corps.reference, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Votre demande" })).toHaveCount(0);
    info.annotations.push({ type: "référence", description: corps.reference });
  });

  test("préremplissage depuis l'URL du calculateur", async ({ page }) => {
    await page.goto(
      "/reserver?f=interieur-net&g=S&o=poils-moderes,siege-enfant:2,tres-sale&ab=1&c=Saintes&code=VOISIN",
    );
    await expect(page.getByRole("radio", { name: "S citadine" })).toBeChecked();
    await expect(groupe(page, "État de l'habitacle").getByRole("radio", { name: /Très sale/ })).toBeChecked();
    await expect(groupe(page, "Des poils d'animaux ?").getByRole("radio", { name: /Un peu de poils/ })).toBeChecked();
    await expect(groupe(page, "Sièges enfants à nettoyer").getByRole("radio", { name: "2", exact: true })).toBeChecked();
    // 59 € − 10 % d'abonnement = 53 € ; + 25 € de poils ; + 2 × 15 € de sièges ; − 10 € (VOISIN).
    const estimation = page.getByRole("complementary", { name: "Votre estimation" });
    await expect(estimation).toContainText(/98\s€/);
    await expect(estimation).toContainText("à confirmer sur vos photos");

    await page.getByLabel("Modèle").fill("Clio");
    await continuer(page);
    await attendreEtape(page, "Votre formule");
    await expect(page.getByRole("radio", { name: /L'Intérieur Net/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Abonnement tous les mois/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Poils d'animaux, quantité modérée/ })).toBeChecked();

    // Cohérence dans l'autre sens : décocher les poils ramène la réponse à « Non ».
    await page.getByRole("checkbox", { name: /Poils d'animaux, quantité modérée/ }).uncheck();
    await page.getByRole("button", { name: "Retour" }).click();
    await attendreEtape(page, "Votre voiture");
    await expect(groupe(page, "Des poils d'animaux ?").getByRole("radio", { name: "Non" })).toBeChecked();
  });

  test("erreurs annoncées quand on avance sans remplir", async ({ page }) => {
    await page.goto("/reserver");
    await continuer(page);
    const resume = page.locator("#resume-erreurs");
    await expect(resume).toHaveAttribute("role", "alert");
    await expect(resume).toBeFocused();
    await expect(resume).toContainText("3 réponses à compléter");
    await expect(resume).toContainText("Indiquez le modèle de la voiture");

    const modele = page.getByLabel("Modèle");
    await expect(modele).toHaveAttribute("aria-invalid", "true");
    await expect(modele).toHaveAccessibleDescription(/Indiquez le modèle de la voiture/);
    await expect(groupe(page, "État de l'habitacle")).toHaveAttribute("aria-invalid", "true");

    await resume.getByRole("link", { name: /Indiquez le modèle/ }).click();
    await expect(modele).toBeFocused();
    await modele.fill("Clio");
    await expect(resume).toContainText("2 réponses à compléter");
    await expect(modele).not.toHaveAttribute("aria-invalid");
    await expect(page.getByRole("heading", { level: 2, name: "Votre voiture" })).toBeVisible();
  });

  test("zone 2 avec L'Intérieur Net : bascule vers Le Complet avant de continuer", async ({ page }) => {
    await page.goto("/reserver?f=interieur-net&g=M&c=Pons");
    await remplirVoiture(page);
    await continuer(page);
    await attendreEtape(page, "Votre formule");
    await continuer(page);
    await attendreEtape(page, "Le lieu");
    await expect(page.getByText("Pons : zone 2, déplacement +10 €.")).toBeVisible();
    await remplirLieu(page);
    await continuer(page);

    await expect(page.locator("#resume-erreurs")).toContainText(`${MESSAGE_ZONE_2}.`);
    await expect(page.getByRole("heading", { level: 2, name: "Le lieu" })).toBeVisible();
    await page.locator("#champ-devis").getByRole("button", { name: "Choisir Le Complet" }).click();
    await expect(page.locator("#resume-erreurs")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Votre estimation" })).toContainText(/129\s€/);
    await continuer(page);
    await attendreEtape(page, "Vos créneaux");
  });

  test("accessibilité de /reserver (axe-core) : aucune violation critique ou sérieuse", async ({ page }) => {
    await page.goto("/reserver");
    await expect(page.getByRole("heading", { level: 2, name: "Votre voiture" })).toBeVisible();
    const regles = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
    const graves = (violations: { impact?: string | null; id: string; help: string }[]) =>
      violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id} : ${v.help}`);

    const depart = await axe(page).withTags(regles).analyze();
    expect(graves(depart.violations)).toEqual([]);

    // Avec le résumé d'erreurs et les messages sous les champs.
    await continuer(page);
    await expect(page.locator("#resume-erreurs")).toBeVisible();
    const erreurs = await axe(page).withTags(regles).analyze();
    expect(graves(erreurs.violations)).toEqual([]);
  });
});

test.describe("réservation sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("nos contacts pour réserver autrement", async ({ page }) => {
    await page.goto("/reserver");
    await expect(page.getByRole("heading", { name: "Le formulaire a besoin de JavaScript" })).toBeVisible();
    await expect(page.getByText("Chargement du formulaire de réservation…")).toBeHidden();
    await expect(page.locator("[data-barre-mobile]")).toBeHidden();
  });
});
