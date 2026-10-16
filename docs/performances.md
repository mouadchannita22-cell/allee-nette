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

Sans bridage, le titre s'affiche dès la première image (175 ms) : le LCP simulé de 2,3 à 2,9 s vient de la simulation 4G, qui compte tout le JavaScript demandé avant ce premier affichage (React et Next, puis le calculateur de l'accueil). À traiter à la recette : alléger ce JavaScript initial pour passer nettement sous 2,5 s.

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
