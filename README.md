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
| 8 — pages légales (mentions, CGV, confidentialité) et mesure d'audience Umami | **À faire** — spécification prête : [`docs/specs/etape-8-legal-et-mesure.md`](docs/specs/etape-8-legal-et-mesure.md) |
| 9 — recette complète (Lighthouse, accessibilité, captures) | À faire |
| 10 — déploiement | `netlify.toml` prêt ; mise en ligne à faire (voir plus bas) |

Tant que l'étape 8 n'est pas faite, les liens « CGV », « Mentions légales » et « Confidentialité » mènent à une page 404. **Ne lancez pas le site auprès du public avant l'étape 8** : ces pages sont obligatoires.

## Lancer le site sur votre ordinateur

1. Installez [Node.js 24](https://nodejs.org) (version LTS).
2. Dans un terminal, dans le dossier du projet :
   ```bash
   npm ci              # installe les dépendances
   cp .env.example .env.local
   npm run dev         # puis ouvrez http://localhost:3000
   ```
3. Sans clé Resend, la réservation fonctionne en **mode démonstration** : la demande est vérifiée et acceptée, mais aucun e-mail ne part.

Vérifications : `npm test` (tests unitaires), `npm run typecheck`, `npm run lint`, `npm run build`, puis `npx playwright test` (parcours de réservation sur mobile et ordinateur, après `npm run build`).

## Modifier le contenu (un seul endroit à chaque fois)

| Je veux changer… | Fichier |
| --- | --- |
| Un prix, une formule, une option, un abonnement, une offre | `src/data/offres.ts` |
| Le téléphone, WhatsApp, l'e-mail, les associés (nom, SIREN, adresse), l'assurance, l'hébergeur, le médiateur | `src/config/site.ts` |
| La zone desservie (communes, zone 1 / zone 2) | `src/config/site.ts` : `ZONE_ACTIVE` et `PREREGLAGES` |
| Les créneaux proposés à la réservation, les textes du formulaire | `src/data/reservation.ts` |
| Les délais (prix ferme sous 2 h, retouche 24 h…) et conditions | `src/data/conditions.ts` |
| Les questions fréquentes | `src/content/faq.ts` |
| Les photos avant/après | `src/data/realisations.ts` (photos à vous, avec l'accord écrit du client, plaques floutées) |

Une valeur laissée vide (`""`) dans `src/config/site.ts` s'affiche sur le site en « [À COMPLÉTER : …] ». Remplissez-les toutes avant le lancement : téléphone, WhatsApp, e-mail, prénoms et noms, SIREN, adresses, assurance, médiateur de la consommation, ville des associés, fiche Google, Instagram.

## Mettre le site en ligne sur Netlify

1. Sur [app.netlify.com](https://app.netlify.com) : **Add new project → Import an existing project → GitHub**, choisissez le dépôt `allee-nette`, branche `main`. Netlify lit `netlify.toml` : ne changez rien aux réglages de build.
2. Dans **Project configuration → Environment variables**, ajoutez (portée **Builds** et **Functions**) :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | l'adresse du site, par exemple `https://allee-nette.netlify.app` (sans barre finale) |
   | `RESEND_API_KEY` | votre clé [Resend](https://resend.com) (offre gratuite), **secrète** |
   | `RESERVATION_EXPEDITEUR` | par exemple `Allée Nette <reservation@votre-domaine.fr>` (domaine vérifié chez Resend) |
   | `INDEXATION` | laissez vide jusqu'au lancement, puis `oui` |

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
2. **Étape 8 — pages légales et mesure d'audience** : à faire relire par un professionnel ; il faut aussi adhérer à un médiateur de la consommation (obligatoire, souvent payant).
3. **Étape 9 — recette** : objectif Lighthouse mobile ≥ 90 ; le LCP simulé de l'accueil (2,8 s) est à ramener sous 2,5 s (voir [`docs/performances.md`](docs/performances.md)). Test du héros 3D sur un vrai téléphone.
4. Logos officiels des moyens de paiement à télécharger sur les sites des émetteurs (ne pas les redessiner).
5. Remplir toutes les valeurs « [À COMPLÉTER] » de `src/config/site.ts`.
