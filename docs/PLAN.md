# Plan validé — Allée Nette

Validé le 15 octobre 2026. Ce document résume les choix faits à l'étape 1 du brief.

## Décisions

| Sujet | Choix |
| --- | --- |
| Zone active | Préréglage `saintes` (ajouté aux préréglages `bordeaux` et `la-rochelle`) |
| Zone 1 | Jusqu'à 8 km du centre de Saintes, déplacement inclus : 13 communes |
| Zone 2 | De 8 à 20 km, +10 € : 74 communes, dont Pons, Burie, Saint-Porchaire, Saint-Savinien |
| Hors zone | Au-delà de 20 km : sur demande, deux véhicules minimum |
| Hébergeur | Netlify (offre gratuite, à revérifier au déploiement) |
| Références des demandes | `AN-AAAA-NNNN`, compteur stocké dans Netlify Blobs (un seul nombre, aucune donnée personnelle) |
| Outils locaux | Node.js 24.22.0 LTS et PortableGit 2.56.0 dans `C:\Users\mouad.channita\outils` |

Les distances sont calculées à vol d'oiseau, entre le centre de Saintes et le centre de chaque commune (geo.api.gouv.fr). Par la route, comptez environ 25 % de plus.

## Dépendances

Versions exactes, publiées depuis au moins 7 jours au moment de l'installation.

| Paquet | Version | Licence |
| --- | --- | --- |
| next, @next/mdx, eslint-config-next | 16.4.0 | MIT |
| react, react-dom | 19.3.0 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| tailwindcss, @tailwindcss/turbopack | 4.3.3 | MIT |
| motion | 14.0.0 | MIT |
| gsap, @gsap/react | 3.15.0 / 2.1.2 | Licence GSAP gratuite (usage commercial autorisé) |
| lenis | 1.3.26 | MIT |
| three, @react-three/fiber | 0.186.1 / 9.8.1 | MIT |
| zod | 4.6.5 | MIT |
| resend | 6.32.1 | MIT |
| stripe | 23.0.0 | MIT |
| @paypal/paypal-js | 11.2.1 | Apache-2.0 |
| @netlify/blobs | 11.1.3 | MIT |
| browser-image-compression | 2.0.2 | MIT |
| vitest | 5.0.3 | MIT |
| @playwright/test | 1.64.0 | Apache-2.0 |
| @axe-core/playwright | 4.13.0 | MPL-2.0 (outil de test, jamais livré) |
| @lhci/cli | 0.15.1 | Apache-2.0 |
| opentype.js | 2.0.0 | MIT (génération du logo) |

@react-three/drei, prévu au départ, a été retiré à l'étape 5 : son composant d'éclairage embarquait des chargeurs d'images HDR inutiles (24 Ko), remplacés par un petit studio de bandes lumineuses écrit pour le projet.

TypeScript 7 (compilateur natif) n'est pas retenu : typescript-eslint exige une version inférieure à 6.1.

## Étapes

1. Plan (ce document) — fait
2. Socle : tokens, polices, logo, mise en page, navigation, pied de page, SEO de base
3. Données et calculateur, avec tests Vitest
4. Pages et contenus
5. Effets visuels, un par un, avec mesure de performance
6. Réservation
7. Paiement en mode test
8. Pages légales et mesure d'audience
9. Recette complète
10. README et déploiement

## Ajustements au brief

1. Le titre du héros est posé sur le canvas, et non derrière la vitre : il reste l'élément LCP et rien ne le masque. L'effet « lettre par lettre » est un éclat qui traverse des lettres déjà lisibles.
2. La FAQ est écrite en TypeScript, avec les prix injectés depuis les données, et génère le JSON-LD `FAQPage`. CGV et mentions restent en MDX.
3. Mesure d'audience avec Umami : Cloudflare Web Analytics ne gère pas les événements personnalisés.
4. Paramètres UTM et codes gardés en mémoire pendant la visite, sans cookie ni stockage local.
5. Anti-spam sans stockage : champ piège, délai minimal de remplissage, limitation du débit en mémoire.
6. Logos de paiement : téléchargés avec votre accord, ou par vous s'ils exigent un compte.
7. Transitions de pages avec le composant `<ViewTransition>` de React 19.3 : aucune bibliothèque ajoutée.
