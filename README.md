# Allée Nette — site web

Site vitrine et de réservation d'Allée Nette, nettoyage automobile à domicile autour de Saintes.
Next.js 16 (App Router), TypeScript, Tailwind CSS. Hébergement prévu : Netlify (offre gratuite).

Le cahier des charges complet est dans [`docs/brief.md`](docs/brief.md), le plan validé dans [`docs/PLAN.md`](docs/PLAN.md).

## Où en est le site

| Étape | État |
| --- | --- |
| 1 à 5 — socle, données et calculateur, pages, effets visuels | Fait (`main`) |
| 6 — réservation en 7 étapes, e-mails, référence AN-AAAA-NNNN | Fait (`main`), testée ; relecture croisée à terminer |
| 7 — paiement en ligne (Stripe en mode test, PayPal en secours) | Fait (branche `etape-7/paiement`), testé avec Stripe et PayPal simulés ; mise en route : [`docs/paiement.md`](docs/paiement.md) |
| 8 — pages légales (mentions, CGV, confidentialité) et mesure d'audience Umami | Fait (branche `etape-8/legal`), testé ; textes à faire relire par un professionnel du droit ; mesure : [`docs/mesure-audience.md`](docs/mesure-audience.md) ; ce qui manque encore : [`docs/a-completer.md`](docs/a-completer.md) |
| 9 — recette complète (Lighthouse, accessibilité, captures) | À faire |
| 10 — déploiement | `netlify.toml` prêt ; mise en ligne à faire (voir plus bas) |

Les pages /mentions-legales, /cgv et /confidentialite existent, mais ce sont des projets : elles affichent encore des « [À COMPLÉTER] » et des « [À CONFIRMER] » (liste complète dans [`docs/a-completer.md`](docs/a-completer.md), `npm run a-completer` pour voir ce qui reste). **Ne lancez pas le site auprès du public avant leur relecture par un professionnel du droit** : ces pages sont obligatoires.

## Lancer le site sur votre ordinateur

1. Installez [Node.js 24](https://nodejs.org) (version LTS).
2. Dans un terminal, dans le dossier du projet :
   ```bash
   npm ci              # installe les dépendances
   cp .env.example .env.local
   npm run dev         # puis ouvrez http://localhost:3000
   ```
3. Sans clé Resend, la réservation fonctionne en **mode démonstration** : la demande est vérifiée et acceptée, mais aucun e-mail ne part.

Vérifications : `npm test` (tests unitaires), `npm run typecheck`, `npm run lint`, `npm run build`, puis `npx playwright test` (réservation, paiement, pages légales et mesure d'audience, sur mobile et ordinateur, après `npm run build`).

## Modifier le contenu (un seul endroit à chaque fois)

| Je veux changer… | Fichier |
| --- | --- |
| Un prix, une formule, une option, un abonnement, une offre | `src/data/offres.ts` |
| Le téléphone, WhatsApp, l'e-mail, les associés (nom, SIREN, adresse), l'assurance, l'hébergeur, le médiateur | `src/config/site.ts` |
| La zone desservie (communes, zone 1 / zone 2) | `src/config/site.ts` : `ZONE_ACTIVE` et `PREREGLAGES` |
| Les créneaux proposés à la réservation, les textes du formulaire | `src/data/reservation.ts` |
| Les délais (prix ferme sous 2 h, retouche 24 h…) et conditions | `src/data/conditions.ts` |
| Les questions fréquentes | `src/content/faq.ts` |
| Les textes légaux (mentions légales, CGV, confidentialité) | `src/content/*.mdx` (les prix, délais, noms… y sont repris automatiquement) ; date de mise à jour dans `src/data/legal.ts` |
| Les photos avant/après | `src/data/realisations.ts` (photos à vous, avec l'accord écrit du client, plaques floutées) |

Une valeur laissée vide (`""`) dans `src/config/site.ts` s'affiche sur le site en « [À COMPLÉTER : …] ». Remplissez-les toutes avant le lancement : téléphone, WhatsApp, e-mail, prénoms et noms, SIREN, adresses, assurance, médiateur de la consommation, ville des associés, fiche Google, Instagram. `npm run a-completer` liste celles qui restent, avec où trouver chaque information ([`docs/a-completer.md`](docs/a-completer.md)).

## Mettre le site en ligne sur Netlify

1. Sur [app.netlify.com](https://app.netlify.com) : **Add new project → Import an existing project → GitHub**, choisissez le dépôt `allee-nette`, branche `main`. Netlify lit `netlify.toml` : ne changez rien aux réglages de build.
2. Dans **Project configuration → Environment variables**, ajoutez (portée **Builds** et **Functions**) :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | l'adresse du site, par exemple `https://allee-nette.netlify.app` (sans barre finale) |
   | `RESEND_API_KEY` | votre clé [Resend](https://resend.com) (offre gratuite), **secrète** |
   | `RESERVATION_EXPEDITEUR` | par exemple `Allée Nette <reservation@votre-domaine.fr>` (domaine vérifié chez Resend) |
   | `INDEXATION` | laissez vide jusqu'au lancement, puis `oui` |
   | `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | facultatif : identifiant du site dans Umami, pour la mesure d'audience sans cookie ([`docs/mesure-audience.md`](docs/mesure-audience.md)) ; vide, aucune mesure |

3. Relancez un déploiement (**Deploys → Trigger deploy**) après chaque modification de variable : les valeurs sont figées au moment du build.
4. Testez une réservation sur votre téléphone.

Tant que `INDEXATION` ne vaut pas `oui`, le site en ligne indique aux moteurs de recherche de ne pas l'indexer : rien n'apparaît sur Google avant votre feu vert.

**Sécurité :** ne mettez jamais une clé dans le code ni dans un message ; uniquement dans les variables Netlify (et dans `.env.local` sur votre ordinateur, qui n'est jamais envoyé sur GitHub).

## Comment fonctionne la réservation

- Le client remplit 7 étapes (voiture, formule, lieu, créneaux, coordonnées, photos et paiement prévu, validation). Le prix estimé est recalculé côté serveur.
- Aucune donnée n'est stockée : la demande part par e-mail aux deux associés (photos en pièces jointes, lien WhatsApp prérempli), et un e-mail de confirmation part au client.
- Seul un compteur (un nombre par année) est gardé dans Netlify Blobs pour la référence `AN-AAAA-NNNN`.
- Anti-spam sans captcha : champ piège invisible, délai minimal de remplissage, 5 demandes au plus par 10 minutes et par adresse.
- Le QR code du garage partenaire pointe vers `/garage`, qui ouvre la réservation avec le code GARAGE ; la source apparaît dans l'e-mail.

## Reste à faire

1. **Paiement en ligne** : créer les deux comptes Stripe (un par associé), en **mode test** d'abord, avec des **clés restreintes** saisies uniquement dans Netlify, puis déclarer les deux webhooks : tout est expliqué pas à pas dans [`docs/paiement.md`](docs/paiement.md). Aucun vrai paiement n'a pu être essayé pendant le développement : faites les essais de ce guide. Vérifiez les frais de chaque solution : le modèle financier compte 1 %.
2. **Pages légales** : faire relire les trois textes par un professionnel du droit, adhérer à un médiateur de la consommation (obligatoire, souvent payant), puis lever chaque « [À COMPLÉTER] » et « [À CONFIRMER] » de [`docs/a-completer.md`](docs/a-completer.md) (règle d'annulation, accord entre responsables conjoints, transferts hors de l'Union européenne…).
   **Mesure d'audience** : créer le site dans Umami et renseigner `NEXT_PUBLIC_UMAMI_WEBSITE_ID` ([`docs/mesure-audience.md`](docs/mesure-audience.md)), après avoir revérifié les conditions de l'offre choisie.
3. **Étape 9 — recette** : objectif Lighthouse mobile ≥ 90 ; le LCP simulé de l'accueil (2,8 s) est à ramener sous 2,5 s (voir [`docs/performances.md`](docs/performances.md)). Test du héros 3D sur un vrai téléphone.
4. Logos officiels des moyens de paiement à télécharger sur les sites des émetteurs (ne pas les redessiner).
5. Remplir toutes les valeurs « [À COMPLÉTER] » de `src/config/site.ts` (`npm run a-completer`).
