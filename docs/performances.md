# Mesures de performance — étape 5 (effets visuels)

Mesures Lighthouse 12 en profil **mobile** (Moto G Power simulé, 4G lente, processeur ralenti 4 fois), sur le site construit (`npm run build && npm start`), page d'accueil. Une mesure après chaque effet, comme le demande le brief.

Budgets du brief (partie 5.3) : LCP < 2,5 s, CLS < 0,1, INP < 200 ms, JavaScript initial < 200 Ko compressé hors module 3D chargé à la demande.

Page d'accueil :

| Étape | Perf. | LCP | Élément LCP | CLS | TBT | JS initial | Chargé ensuite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Avant les effets (fin d'étape 4) | 95 | 2,4 s | titre `h1` | 0 | 210 ms | 173 Ko | — |
| + Héros « pare-brise » | 96 | 2,2 s | titre `h1` | 0 | 180 ms | 177 Ko | module 3D : 248 Ko, uniquement en mode complet |
| + « Comment ça marche » épinglé (médiane de 3 mesures) | 96 | 2,6 s | titre `h1` | 0 | 114 ms | 183 Ko | — |
| + Avant/après, goutte « sans rinçage », anneau 24 h | 98 | 2,2 s | titre `h1` | 0 | 110 ms | 189 Ko | — |
| + Micro-interactions (médiane de 3) | 96 | 2,8 s | titre `h1` | 0 | 65 ms | 191 Ko | — |

Sans bridage, le titre s'affiche dès la première image (175 ms) : le LCP simulé de 2,3 à 2,9 s vient de la simulation 4G, qui compte tout ce qui est demandé avant ce premier affichage : HTML (37 Ko), polices (77 Ko), CSS (13,5 Ko) et JavaScript (174 Ko, dont 117 Ko pour React et Next). À traiter à la recette : alléger ce JavaScript initial et le HTML de l'accueil pour passer nettement sous 2,5 s.

Essai écarté : ne plus précharger les polices fait chuter le score à 87 (décalage de mise en page de 0,16 au changement de police, premier affichage à 1,5 s).

Page Tarifs :

| Étape | Perf. | LCP | Élément LCP | CLS | TBT | JS initial | Chargé ensuite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Avant la voiture 3D | 95 | 2,8 s | introduction de la page | 0 | 100 ms | 177 Ko | — |
| + Voiture 3D et gabarits, prix qui roulent | 97 | 2,3 s | introduction de la page | 0 | 140 ms | 182 Ko | three.js partagé avec l'accueil (244 Ko, déjà en cache) + scène |

Page Zones :

| Étape | Perf. | LCP | Élément LCP | CLS | TBT | JS initial | Chargé ensuite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| + Carte des zones, rendue côté serveur (premier essai) | 96 | 2,8 s | introduction de la page | 0 | 50 ms | 177 Ko | — (HTML : 44 Ko compressés) |
| + Carte des zones, chargée après l'affichage (médiane de 3) | 97 | 2,6 s | introduction de la page | 0 | 52 ms | 179 Ko | contours : 30 Ko (HTML : 20,5 Ko compressés) |

D'une mesure à l'autre, Lighthouse fait varier le LCP de quelques dixièmes de seconde. Le LCP de 2,8 s mesuré avant l'effet, au-dessus du budget, est à reprendre à la recette, avec la médiane de trois mesures par page.

Le SEO affiche 66 hors production : les pages portent volontairement `noindex` tant que le site n'est pas en ligne.

## Limites de ces mesures

- **Sans carte graphique.** Le conteneur de mesure n'a pas de GPU. WebGL y passe par un rendu logiciel (2 à 3 images par seconde), que le site détecte : il bascule alors en **mode dégradé** (image fixe et gouttes CSS). Les scores ci-dessus mesurent donc la page avec ce repli. C'est aussi ce que verra PageSpeed Insights, qui n'a pas de GPU non plus.
- **Le mode complet doit être mesuré sur un vrai téléphone.** Forcé en rendu logiciel (`?fx=complet`), le héros fait monter le TBT à 2,2 s, mais ce chiffre ne dit rien d'un téléphone équipé d'un GPU. À faire à la recette (étape 9) : Chrome sur un Android de milieu de gamme relié à l'ordinateur (débogage USB), onglet Performance, sur `/` puis en essuyant la vitre.

## Ce qui protège le titre et la réservation

- Le titre est du HTML : il est l'élément LCP, avant comme après l'effet.
- Le module 3D se charge après l'événement `load`, quand le navigateur est au repos (`requestIdleCallback`), jamais pendant le premier rendu.
- Le canvas est plafonné à une densité de pixels de 1,5 et se met en pause hors écran ou quand l'onglet est caché.
- L'image de repli est dessinée dans un canvas : une grande image chargée après coup deviendrait sinon l'élément LCP.

## Forcer un mode pour la recette

| Adresse | Effet |
| --- | --- |
| `/?fx=complet` | WebGL, même sur un appareil jugé modeste |
| `/?fx=degrade` | Image fixe et gouttes CSS |
| `/?fx=reduit` | Image fixe, aucune animation (comme `prefers-reduced-motion`) |
| `/?affiche` | Rendu déterministe utilisé par `npm run affiche` pour fabriquer l'image de repli |

## Recette (étape 9, 18 octobre 2026)

Lighthouse 12.6.1, profil mobile simulé, build de production. Le SEO est mesuré sur un build `CONTEXT=production INDEXATION=oui` : sans cette variable, le site reste volontairement en `noindex` (SEO à 66).

| Page | Perf. | Access. | Bonnes pratiques | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Accueil (médiane de 5 mesures) | 94 | 100 | 100 | 100 | 2,4 s | 0 | 180 ms |
| /tarifs | 94 à 98 | 100 | 100 | 100 | 2,3 à 2,6 s | 0 | 100 à 200 ms |
| /reserver | 93 à 95 | 100 | 100 | 100 | 2,3 à 2,9 s | 0 | 170 à 210 ms |
| /zones | 96 à 98 | 100 | 100 | — | 2,2 à 2,6 s | 0 | 100 à 130 ms |
| /faq | 96 à 99 | 100 | 100 | — | 2,0 à 2,8 s | 0 | 50 à 80 ms |
| /paiement | 93 à 96 | 100 | 100 | 66 (noindex voulu) | 2,3 à 3,1 s | 0 | 120 à 200 ms |
| /cgv | 98 | 100 | 100 | — | 2,2 s | 0 | 100 ms |

Corrections faites pendant la recette :

- **/reserver** : décalage de mise en page de 0,41 (le pied de page remontait puis redescendait à l'arrivée du formulaire, construit dans le navigateur). L'emplacement réserve maintenant la hauteur du formulaire, mesurée à 412, 768 et 1 280 px : CLS 0.
- **/paiement** : même défaut (0,50) pendant la vérification du lien : même correction, CLS 0.
- Avertissement ESLint d'`opengraph-image.tsx` retiré.

D'une mesure à l'autre, le LCP simulé varie de 0,5 s sur cette machine partagée. La médiane de l'accueil (2,4 s) passe sous le budget de 2,5 s, mais certaines mesures isolées le dépassent. Le héros 3D reste à vérifier sur un vrai téléphone (mode complet), voir « Limites de ces mesures ».
