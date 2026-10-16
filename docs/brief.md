# Brief pour Claude Code — Site web « Allée Nette »

> Cahier des charges complet. Lis-le entièrement avant d'écrire la moindre ligne de code.
> Tout ce qui est entre crochets `[…]` est une information à me demander ou un emplacement à laisser visible jusqu'à ce que je la fournisse.

---

## 1. Ta mission

Tu es un développeur front-end senior et un directeur artistique web. Tu construis le site vitrine et de réservation d'**Allée Nette**, un service de nettoyage automobile **exclusivement au domicile du client**, créé par deux étudiants en micro-entreprise.

Le site doit :

1. **Couper le souffle** dès la première seconde, avec des effets visuels dignes d'un site primé (Awwwards), tout en restant rapide sur un téléphone moyen en 4G.
2. **Convertir** : un visiteur doit comprendre en 5 secondes ce que nous faisons, où, à quel prix, et réserver en moins de 2 minutes.
3. **Afficher toutes les formules, options et prix** décrits en partie 7, sans exception, avec un calculateur de prix interactif.
4. **Gérer les paiements** : PayPal, carte bancaire (CB, Visa, Mastercard), Apple Pay, Google Pay en ligne, et sur place par carte, sans contact, PayPal ou espèces (partie 10).
5. **Respecter le droit français** de la consommation et du commerce en ligne (partie 13).

La promesse centrale, à faire ressentir partout :
**« Votre voiture propre, sans quitter la maison. »**
Prix ferme validé sur photos avant le rendez-vous, aucun supplément surprise, retouche gratuite sous 24 heures.

---

## 2. Règles non négociables

### 2.1 Le modèle

- Nous intervenons **uniquement chez le client**, sur son emplacement privé (allée, cour, garage ouvert) ou sur une place de copropriété avec accord écrit du syndic. Nous n'avons ni local, ni station, ni atelier. Aucune page ne doit suggérer au client de se déplacer.
- Lavage extérieur **sans rinçage**, avec notre propre eau : aucun rejet d'eau. Pas de jet, pas de haute pression.
- Il nous faut **une prise électrique à moins de 20 mètres** du véhicule. Le client n'a pas besoin de point d'eau.
- Le client est présent 5 minutes au début (état des lieux) et à la fin (contrôle). Il déplace lui-même sa voiture : nous ne conduisons jamais le véhicule.

### 2.2 Honnêteté (obligatoire, y compris pour la loi et pour Google)

- **Aucun faux avis, aucun faux témoignage, aucune fausse note.** La section « Avis » reste masquée tant que nous n'avons pas 5 avis Google réels ; ensuite, elle renvoie vers notre fiche Google. Pas de balisage `AggregateRating`.
- **Aucun faux chiffre** : pas de « +500 clients satisfaits », pas de « n°1 », pas de compteur inventé, pas de badge « la plus choisie » tant que nous n'avons pas de données.
- **Photos avant/après : uniquement les nôtres**, avec l'accord écrit du client et les plaques floutées. En attendant, utilise des emplacements clairement marqués « Photo à venir ». Aucune photo de banque d'images présentée comme notre travail.
- Pas de promesse invérifiable : écris « sans rinçage, aucun rejet d'eau », jamais « 100 % écologique ». Pas de « certifié », pas de « garanti sans rayure ».
- Les prix affichés sont des prix **fermes par gabarit**. Les seuls « dès » autorisés renvoient vers la grille complète.

### 2.3 Technique

- Mobile d'abord : la majorité des visiteurs arrivera par Google Maps sur un téléphone.
- Les effets visuels ne doivent jamais bloquer la lecture ni la réservation (partie 5.3).
- Aucune clé secrète côté navigateur. Aucune donnée bancaire stockée chez nous.
- Coûts fixes minimaux : outils gratuits ou payés à l'usage. Ne propose aucun service à abonnement sans me le signaler et sans alternative gratuite.
- Bibliothèques maintenues, versions stables actuelles, licences compatibles avec un usage commercial. Pas de bibliothèque payante.

---

## 3. Stack technique et hébergement

| Besoin | Choix | Pourquoi |
| --- | --- | --- |
| Framework | Next.js (dernière version stable, App Router) + TypeScript strict | Pages statiques rapides, fonctions serveur pour le paiement et le formulaire |
| Styles | Tailwind CSS (dernière version stable) avec des tokens de design en variables CSS | Rapide à maintenir |
| Animations d'interface | Motion (ex-Framer Motion) | Micro-interactions, transitions |
| Animations au défilement | GSAP + ScrollTrigger + SplitText (tous gratuits depuis 2025) | Séquences épinglées, révélations de texte |
| Défilement fluide | Lenis | Sensation premium, coupé si mouvement réduit |
| 3D et shaders | Three.js via React Three Fiber + drei | Héros WebGL, voiture 3D |
| Validation | Zod | Formulaire et fonctions serveur |
| E-mails | Resend (offre gratuite) ou équivalent | Notification des demandes aux deux associés |
| Paiement | Stripe Checkout (CB, Visa, Mastercard, Apple Pay, Google Pay, PayPal) ; bouton PayPal en secours | Une seule intégration pour presque tous les moyens |
| Mesure d'audience | Umami ou Cloudflare Web Analytics, sans cookie | Pas de bandeau cookies nécessaire |
| Tests | Vitest (logique de prix), Playwright (parcours, captures), axe-core (accessibilité), Lighthouse CI | Qualité vérifiable |
| Hébergement | Netlify (offre gratuite) ou Cloudflare Pages | Gratuit avec fonctions serveur. **Ne pas utiliser l'offre Hobby de Vercel, réservée à un usage non commercial.** Vérifie les conditions de l'offre gratuite retenue au moment du déploiement |

Organisation du code :

```
src/
  app/                  pages (App Router)
  components/           composants d'interface
  components/fx/        effets visuels (WebGL, scroll, curseur), chargés à la demande
  config/site.ts        nom, contacts, zone active, réseaux, mentions légales
  data/offres.ts        formules, options, prix, zones, abonnements, offres
  lib/prix.ts           calculateur de prix (fonctions pures, testées)
  lib/paiement.ts       liens de paiement signés, appels Stripe/PayPal (serveur)
  content/              textes longs (FAQ, CGV, mentions) en MDX
tests/
```

**Toutes les données métier vivent dans `config/site.ts` et `data/offres.ts`.** Changer un prix, une commune ou un numéro de téléphone ne doit demander qu'une modification à un seul endroit, répercutée partout : cartes de prix, calculateur, FAQ, données structurées, e-mails.

---

## 4. Direction artistique

### 4.1 Concept : « l'éclat de l'eau sur une carrosserie, la nuit »

Contraste entre une ambiance sombre et profonde (le soir, la voiture sale) et l'éclat net de l'eau, de l'écume et du reflet (la voiture propre). Le site doit donner la sensation physique du propre : brillance, gouttes perlées, mousse légère, reflets qui glissent.

### 4.2 Palette (à affiner, contraste AA obligatoire)

| Rôle | Couleur |
| --- | --- |
| Fond nuit | `#0B1220` |
| Bleu profond | `#0F2A4A` |
| Aqua (accent principal) | `#2EE6D6` |
| Turquoise (dégradés) | `#19C3B1` |
| Écume (fonds clairs) | `#F3FAFC` |
| Blanc | `#FFFFFF` |
| Ardoise (textes secondaires) | `#5B6B7F` |
| Alerte douce | `#FFB547` |

Le héros et les sections « effet » sont sombres ; les sections de lecture (tarifs détaillés, FAQ, pages légales) sont claires pour le confort.

### 4.3 Typographie (Google Fonts via `next/font`)

- Titres : **Unbounded** (graisse 600 à 800), ou une alternative libre de même caractère.
- Texte : **Plus Jakarta Sans** (400 à 700).
- Chiffres des prix en chiffres tabulaires, très grands, avec une animation de défilement à chaque changement.

### 4.4 Logo

Crée un **logotype original** en SVG : « Allée Nette » avec une goutte stylisée intégrée à une lettre. Rien qui imite un logo existant. Fournis une version claire, une sombre et une icône carrée (favicon, icônes d'application).

### 4.5 Ton

Vouvoiement, phrases courtes, concret, chaleureux. On parle de bénéfices (« vous récupérez votre samedi ») et on rassure sans exagérer.

---

## 5. Effets visuels à couper le souffle

### 5.1 Effets signatures

1. **Héros « pare-brise »** (accueil, plein écran)
   - Le visiteur « regarde à travers un pare-brise » couvert de poussière et de gouttes.
   - Shader WebGL : couche de saleté procédurale (bruit), gouttes réfractantes qui perlent et glissent, buée légère.
   - Au chargement, un passage de microfibre animé nettoie une bande en diagonale. Ensuite, le pointeur (souris ou doigt) **essuie la vitre** en temps réel : masque de nettoyage dans une texture de rendu (« ping-pong FBO »), qui se resalit très lentement.
   - Derrière la vitre : le titre « Votre voiture propre, sans quitter la maison. », révélé lettre par lettre (SplitText), et une voiture générique en 3D aux reflets réalistes (environnement HDRI sous licence CC0, par exemple Poly Haven).
   - Sur mobile, l'essuyage suit le doigt ; en plus, un balayage automatique toutes les 6 secondes.
   - Appel à l'action principal visible immédiatement, hors du canvas : « Réserver mon nettoyage — prix ferme sous 2 heures ».
2. **Voiture 3D et gabarits** (section tarifs)
   - Modèle low-poly générique, sans marque ni design reconnaissable d'un modèle réel. Utilise des kits 3D sous licence CC0 (par exemple Kenney ou Quaternius) recolorés aux couleurs de la marque, et vérifie la licence.
   - Le sélecteur de gabarit S / M / L fait **morpher ou basculer** la voiture (citadine, berline, grand SUV) avec une transition fluide ; les prix des cartes roulent jusqu'à leur nouvelle valeur.
3. **« Comment ça marche » épinglé au défilement**
   - Section épinglée (ScrollTrigger) en 4 étapes, avec une maquette de téléphone dont l'écran change à chaque étape : 1. Vous réservez et envoyez 3 photos ; 2. Prix ferme confirmé sous 2 heures ; 3. On vient chez vous avec tout le matériel ; 4. Vous contrôlez, vous payez après.
   - Une jauge d'eau se remplit au fil des étapes.
4. **Avant/après « glisser pour nettoyer »**
   - Curseur glissant avec une poignée en forme de raclette ou de goutte, inertie douce, accessible au clavier.
   - Emplacements « Photo à venir » tant que nous n'avons pas nos propres photos.
5. **Section « Sans rinçage, aucun rejet »**
   - Une goutte tombe, s'étale en onde et révèle le message « Environ 10 litres de notre eau. Rien dans le caniveau. »
6. **Garantie Retouche 24 h**
   - Anneau de minuterie animé de 24 h autour du texte de garantie.
7. **Carte des zones**
   - Carte SVG stylisée des communes desservies, à partir des contours de geo.api.gouv.fr (Licence Ouverte), avec des ondes concentriques depuis notre point de départ, et zones 1 et 2 en deux intensités d'aqua.
   - Champ « Votre commune » avec autocomplétion : zone 1, zone 2 ou hors zone, avec le supplément correspondant.

### 5.2 Micro-interactions

- Boutons d'appel à l'action « magnétiques » (ils attirent légèrement le pointeur) avec un reflet qui glisse au survol.
- Cartes de prix avec inclinaison 3D et reflet lumineux au survol (sur ordinateur uniquement).
- Curseur personnalisé en bulle d'écume qui grossit sur les éléments cliquables (sur ordinateur uniquement, désactivable).
- Bulles d'écume en parallaxe légère dans certaines sections (instanciées, très peu coûteuses).
- Fond en dégradé « liquide » animé (shader ou CSS) derrière le calculateur.
- Navigation en verre dépoli qui se réduit au défilement ; barre de progression de lecture fine en aqua.
- Transitions entre pages en « vague » (clip-path animé).
- Chiffres animés : prix et totaux qui roulent, ressort léger.
- Pied de page avec une vague SVG animée.

### 5.3 Garde-fous de performance et d'accessibilité (obligatoires)

- **L'élément LCP est le titre du héros en HTML**, jamais le canvas. Le canvas WebGL se charge après le premier rendu (`next/dynamic`, `ssr: false`), en fondu.
- Budgets sur mobile en 4G : LCP < 2,5 s, CLS < 0,1, INP < 200 ms, JavaScript initial < 200 Ko compressé hors module 3D chargé à la demande.
- Résolution du canvas limitée (`devicePixelRatio` plafonné à 1,5), rendu en pause hors écran et quand l'onglet est caché.
- **Mode dégradé automatique** sur les appareils modestes (mémoire, nombre de cœurs, échec WebGL, débit lent) : image statique travaillée et animations CSS légères.
- **`prefers-reduced-motion`** : pas de défilement fluide, pas de parallaxe, pas de shader animé, transitions instantanées ; tout le contenu reste lisible.
- Aucune animation ne masque un texte ou un bouton plus de 300 ms. Aucun son.
- Images en AVIF ou WebP via `next/image`, polices en `swap`, préchargement du strict nécessaire.

---

## 6. Architecture du site

| Page | URL | Contenu clé | Priorité |
| --- | --- | --- | --- |
| Accueil | `/` | Héros, promesse, prix « dès », comment ça marche, formules, garantie, zones, FAQ courte, appel à l'action | Lancement |
| Tarifs et formules | `/tarifs` | Grille complète par gabarit, options, suppléments, zones, abonnements, offres, calculateur | Lancement |
| Nettoyage intérieur à domicile | `/nettoyage-interieur-voiture-domicile` | L'Intérieur Net et Le Grand Soin, détails, avant/après | Lancement |
| Lavage extérieur sans rinçage | `/lavage-exterieur-sans-rincage` | Méthode, conditions, Le Complet | Lancement |
| Prêt à vendre ou à rendre | `/pret-a-vendre-ou-a-rendre` | Formule vente et restitution de location | Mois 2 |
| Zones d'intervention | `/zones` | Carte, communes, conditions, suppléments | Lancement |
| Réserver | `/reserver` | Formulaire en étapes | Lancement |
| Paiement | `/paiement` | Paiement en ligne d'une prestation confirmée | Lancement |
| Bons cadeaux | `/bons-cadeaux` | Achat en ligne | Décembre |
| Professionnels | `/professionnels` | Pack Utilitaires Artisan, sur devis | Mois 3 |
| À propos | `/a-propos` | Qui nous sommes, assurance, engagements | Lancement |
| Questions fréquentes | `/faq` | FAQ complète | Lancement |
| Avis | `/avis` | Uniquement à partir de 5 avis Google réels | Plus tard |
| Mentions légales, CGV, confidentialité | `/mentions-legales`, `/cgv`, `/confidentialite` | Obligations légales | Lancement |

Navigation : Tarifs · Prestations · Zones · FAQ · bouton « Réserver ». Sur mobile, une **barre fixe en bas d'écran** avec « Réserver », « Appeler » et « WhatsApp ».

Pas de page « nettoyage voiture [commune] » répétée pour chaque ville : une seule page Zones.

---

## 7. Données : formules, options, prix

Implémente exactement ces données dans `src/data/offres.ts` (typées). Tous les prix sont TTC en euros. Mention obligatoire près des prix : « TVA non applicable, article 293 B du CGI ».

### 7.1 Gabarits

| Code | Libellé | Exemples |
| --- | --- | --- |
| S | Citadine | Clio, 208, Yaris… |
| M | Compacte, berline ou petit SUV | Golf, 308, Captur… |
| L | Grand SUV, monospace, 7 places, break long, cabine d'utilitaire | — |

Ajoute une aide « Quel est mon gabarit ? » : le client tape son modèle, une liste de correspondances simple propose S, M ou L (modifiable dans les données).

### 7.2 Formules

| Formule | S | M | L | Durée sur place |
| --- | --- | --- | --- | --- |
| **L'Intérieur Net** — entrée de gamme | 59 € | 69 € | 79 € | 1 h 15 à 1 h 45 |
| **Le Complet** — notre formule principale | 109 € | 119 € | 129 € | 2 h 30 à 3 h 15 |
| **Le Grand Soin Intérieur** — approfondi | 109 € | 119 € | 139 € | 3 h à 4 h, puis 2 à 6 h de séchage |
| **Prêt à vendre ou à rendre** — vente ou restitution de location | 129 € | 139 € | 159 € | Environ 3 h 40, puis séchage |

Contenu de chaque formule :

- **L'Intérieur Net**
  - Inclus : aspiration complète (sièges, moquettes, tapis, coffre), tableau de bord, consoles, contre-portes, seuils de portes, vitres intérieures.
  - Non inclus : shampooing, poils incrustés, taches.
  - Argument : « À la station, c'est vous qui travaillez 45 minutes. Ici, vous ne bougez pas. »
- **Le Complet**
  - Inclus : L'Intérieur Net + lavage extérieur sans rinçage, jantes (face visible), vitres extérieures, plastiques extérieurs.
  - Non inclus : boue épaisse, goudron, décontamination, polissage, moteur.
  - Argument : « Votre samedi est à vous : on vient, vous récupérez une voiture propre. »
- **Le Grand Soin Intérieur**
  - Inclus : L'Intérieur Net + injection-extraction des sièges, moquettes et tapis, détachage, cuir nettoyé et nourri, désodorisation.
  - Non inclus : polissage, odeur de tabac ancienne, taches anciennes ou de javel, brûlures, ciel de toit fragile.
  - À savoir : « La voiture reste humide quelques heures : prévoyez de ne pas l'utiliser, vitres entrouvertes si possible. »
  - Argument : « Rendez votre voiture saine pour la famille, ou vendez-la plus facilement. »
- **Prêt à vendre ou à rendre**
  - Inclus : Le Grand Soin Intérieur + 6 photos d'annonce prises sur place.
  - Argument : « Des photos d'annonce qui donnent envie, ou une voiture rendue propre avec photos datées. »

### 7.3 Options et suppléments

| Option | Prix | Règle |
| --- | --- | --- |
| Poils d'animaux, quantité modérée | +25 € | Toutes formules |
| Poils d'animaux, quantité importante | +45 € | Toutes formules |
| Siège enfant démonté et nettoyé | +15 € par siège | Toutes formules, quantité 1 à 3 |
| Shampooing des sièges avant | +25 € | Non disponible avec Le Grand Soin et Prêt à vendre (déjà inclus) |
| Shampooing des cinq sièges | +45 € | Idem ; exclusif du précédent |
| Cuir nettoyé et nourri | +39 € | Idem |
| Désodorisation | +20 € | Idem |
| Détachage ponctuel, une zone | +15 € par zone | Non disponible avec Le Grand Soin et Prêt à vendre |
| Véhicule très sale (sable, boue, déchets) | +25 à +45 € | Montant fixé sur photo, affiché « à confirmer sur vos photos » |
| Extérieur seul sans rinçage | 55 € | Uniquement en complément ou lors d'une tournée déjà prévue dans votre secteur |

### 7.4 Déplacement

| Zone | Distance du point de départ | Supplément | Règle |
| --- | --- | --- | --- |
| Zone 1 | Jusqu'à 8 km | Inclus | Commande minimale 59 € |
| Zone 2 | 8 à 15 km | +10 € | Le Complet, Le Grand Soin ou Prêt à vendre au minimum |
| Hors zone | Au-delà de 15 km | Sur demande | Deux véhicules minimum |

La zone se détermine par **liste de communes** dans `config/site.ts`, pas par géolocalisation. Prévois **deux préréglages**, avec la zone active choisie par une seule variable (`ZONE_ACTIVE = "bordeaux" | "la-rochelle"`). Les listes sont des exemples à adapter à notre point de départ réel :

- `bordeaux`
  - Zone 1 : Pessac, Gradignan, Villenave-d'Ornon, Talence, Mérignac.
  - Zone 2 : Bègles, Canéjan, Cestas, Léognan, Le Haillan, Eysines, Bordeaux (quartiers sud).
- `la-rochelle`
  - Zone 1 : Lagord, Puilboreau, Périgny, Nieul-sur-Mer, Aytré, La Rochelle.
  - Zone 2 : Dompierre-sur-Mer, L'Houmeau, Saint-Xandre, Sainte-Soulle, Angoulins, Marsilly, Châtelaillon-Plage.

Les textes, titres SEO et données structurées utilisent automatiquement les communes de la zone active.

### 7.5 Abonnements

Remise de 10 %, sans engagement, créneau fixe, priorité de réservation. Prix arrondis à l'euro inférieur :

| Abonnement | S | M | L |
| --- | --- | --- | --- |
| Le Complet tous les 2 mois | 98 € | 107 € | 116 € |
| L'Intérieur Net tous les mois | 53 € | 62 € | 71 € |

### 7.6 Offres commerciales

Chaque offre peut être activée ou désactivée dans les données.

| Offre | Mécanique |
| --- | --- |
| Lancement, 30 premiers clients | Désodorisation offerte (valeur 20 €) sur L'Intérieur Net et Le Complet (déjà incluse dans Le Grand Soin), compte rendu photo et créneau prioritaire. Compteur des places restantes **mis à jour à la main**, jamais inventé |
| Code GARAGE (clients de notre garage partenaire) | Désodorisation ou un siège enfant offert, créneau sous 7 jours |
| Parrainage | 10 € de remise pour le parrain et 10 € pour le filleul, après la prestation payée du filleul |
| Rue groupée | Deux voisins le même jour : 10 € de remise chacun |
| Deux voitures à la même adresse | 15 € de remise sur la deuxième |
| Professionnels, trois véhicules ou plus lors d'une même visite | 10 % de remise |
| Bon cadeau | Au prix normal, valable 12 mois |

### 7.7 Garantie Retouche 24 h

Texte à publier : « Un point inclus dans votre formule ne vous convient pas ? Envoyez-nous une photo dans les 24 heures : nous revenons le reprendre gratuitement. »

Limites, à reprendre dans les CGV :
- un seul retour par prestation, en zone 1 uniquement ;
- exclusions : défauts présents avant la prestation et photographiés à l'arrivée, taches signalées comme non récupérables, odeurs de tabac anciennes, saleté apparue après la prestation.

Pas de « satisfait ou remboursé ».

### 7.8 Pack Utilitaires Artisan (page Professionnels)

95 € par véhicule (prix d'appel à tester), 10 % de remise dès trois véhicules lors d'un même passage. Contenu : aspiration et nettoyage complet de la cabine (sièges, tableau de bord, portières, vitres), extérieur sans rinçage, jantes. Rythme mensuel ou bimestriel, le samedi matin. Facture mensuelle payable à 30 jours, résiliation sans frais avec un mois de préavis.

---

## 8. Calculateur de prix

Composant présent sur `/tarifs`, résumé sur l'accueil, et prérempli dans le formulaire de réservation.

**Entrées** : formule, gabarit (avec l'aide « Quel est mon gabarit ? »), options (avec quantités), commune, abonnement oui ou non, code éventuel.

**Règles** (fonctions pures dans `lib/prix.ts`) :
- total = prix de la formule pour le gabarit + options applicables + supplément de zone − remises applicables ;
- options non applicables à la formule : grisées, avec la raison au survol ou au toucher (« déjà inclus dans Le Grand Soin ») ;
- zone 2 avec L'Intérieur Net : message « En zone 2, choisissez Le Complet ou Le Grand Soin », bouton de bascule ;
- hors zone : « Sur demande, deux véhicules minimum » et bouton WhatsApp prérempli ;
- « véhicule très sale » : affiché comme fourchette, exclu du total, avec la mention « montant confirmé sur vos photos » ;
- abonnement : remise de 10 % sur la formule, arrondie à l'euro inférieur.

**Affichage** : total animé, détail ligne par ligne, et toujours la phrase « Estimation. Votre prix ferme est confirmé sur vos photos sous 2 heures, avant tout rendez-vous. »

**Tests unitaires obligatoires** (Vitest), au minimum :

| Cas | Résultat attendu |
| --- | --- |
| Le Complet, M, zone 1, sans option | 119 € |
| L'Intérieur Net, S, poils modérés, 2 sièges enfants | 59 + 25 + 30 = 114 € |
| Le Grand Soin, L, désodorisation | Option refusée (incluse) ; total 139 € |
| Le Complet, M, zone 2 | 129 € |
| L'Intérieur Net, M, zone 2 | Refusé, message de zone 2 |
| Abonnement Le Complet, M | 107 € |
| Prêt à vendre, M | 139 € |
| Deux voitures même adresse : Le Complet M + L'Intérieur Net S | 119 + 59 − 15 = 163 € |
| Shampooing des sièges avant + shampooing des cinq sièges | Les deux ne peuvent pas être cochés ensemble |

---

## 9. Réservation

### 9.1 Parcours en étapes (page `/reserver`)

1. **Votre voiture** : modèle, gabarit (aide automatique), état (normal, sale, très sale), animaux (non, un peu de poils, beaucoup), nombre de sièges enfants.
2. **Votre formule** : formule et options (préremplies depuis le calculateur), total estimé visible en permanence.
3. **Le lieu** : adresse d'intervention et commune (zone calculée), type d'emplacement (allée, cour, garage, parking de copropriété), prise électrique à moins de 20 m (oui, non, je ne sais pas).
4. **Vos créneaux** : trois créneaux souhaités. Par défaut, les créneaux proposés sont le mercredi après-midi et le samedi ; ils sont configurables.
5. **Vos coordonnées** : prénom, téléphone, e-mail, « Comment nous avez-vous connus ? » (Google, garagiste, voisin, réseaux sociaux, bouche-à-oreille, autre), code éventuel (GARAGE, VOISIN, code parrain).
6. **Photos et paiement** :
   - jusqu'à 3 photos (habitacle avant, habitacle arrière, extérieur), compressées dans le navigateur avant l'envoi (environ 1 600 px de large, moins de 500 Ko chacune). Alternative affichée : « ou envoyez-les-nous sur WhatsApp » ;
   - moyen de paiement prévu : en ligne après confirmation (carte, Apple Pay, Google Pay, PayPal), ou sur place après la prestation (carte et sans contact, PayPal, espèces).
7. **Validation**, avec trois cases distinctes :
   - acceptation des CGV (lien) ;
   - « Je demande que la prestation soit réalisée avant la fin du délai de rétractation de 14 jours, et je reconnais perdre mon droit de rétractation une fois la prestation entièrement exécutée. » ;
   - consentement au traitement des données pour traiter la demande (lien vers la politique de confidentialité).
   - Une case séparée et facultative pour recevoir nos offres. Aucune case n'est précochée.

### 9.2 Messages conditionnels

- Parking de copropriété : « Nous avons besoin de l'accord écrit du syndic ou du règlement de copropriété avant d'intervenir. »
- Pas de prise électrique : « Nous avons besoin d'une prise à moins de 20 m. Écrivez-nous : nous verrons ensemble si c'est faisable. » La demande reste possible.
- Extérieur demandé : rappel que l'extérieur est reporté sans frais en cas de pluie annoncée ou de restriction d'eau.

### 9.3 Traitement

- Une fonction serveur valide les données avec Zod. Anti-spam : champ piège invisible et limitation du débit, sans captcha intrusif.
- Un e-mail part aux deux associés avec le récapitulatif complet, les photos en pièces jointes, une référence unique (format `AN-AAAA-NNNN`) et un lien WhatsApp prérempli pour répondre au client.
- Un e-mail de confirmation part au client : « Demande reçue. Nous vous confirmons le prix ferme sous 2 heures. »
- Page de remerciement : récapitulatif, délai de réponse, bouton WhatsApp pour envoyer les photos, rappel des conditions (prise électrique, voiture accessible, objets de valeur retirés).
- Ne stocke aucune donnée au-delà de ce qu'exige l'envoi. Si un stockage est nécessaire, demande-moi d'abord.

---

## 10. Paiement

### 10.1 Principe, imposé par le droit et par notre organisation

- **Aucun paiement au moment de la demande** : le prix n'est ferme qu'après la validation des photos.
- Une fois le prix confirmé, le client choisit :
  - **payer en ligne** via le lien sécurisé que nous lui envoyons : carte bancaire (CB, Visa, Mastercard), Apple Pay, Google Pay, PayPal ;
  - **payer sur place après la prestation** : carte et sans contact (Apple Pay, Google Pay) sur notre terminal mobile, PayPal par QR code, ou espèces contre facture.
- **Deux micro-entreprises, deux encaissements.** Chacun des deux associés facture et encaisse les prestations qu'il réalise, sur son propre compte. Le système de paiement doit donc gérer **deux comptes Stripe** (et deux comptes PayPal en secours), choisis par un paramètre `encaisseur = A | B`. La page de paiement affiche clairement le nom de l'entrepreneur individuel qui encaisse (« Paiement à [Prénom Nom] EI, SIREN […] »).

### 10.2 Liens de paiement signés

- Format : `/paiement?ref=AN-2026-0142&montant=119&libelle=Le%20Complet%20M&encaisseur=A&exp=…&sig=…`.
- La signature est un HMAC-SHA256 calculé côté serveur avec un secret (`PAYMENT_LINK_SECRET`). Elle couvre la référence, le montant, le libellé, l'encaisseur et l'expiration (7 jours). Sans signature valide, la page refuse le paiement et propose de nous contacter.
- Page d'administration protégée par mot de passe (`/admin/lien-paiement`, variable `ADMIN_PASSWORD`, en `noindex`), utilisable sur téléphone :
  - on saisit la référence, le montant, le libellé et l'encaisseur ;
  - elle génère le lien signé, avec boutons « Copier », « Envoyer par WhatsApp » et « Envoyer par SMS ».
- Montant contrôlé côté serveur : entre 15 € et 600 €.

### 10.3 Page `/paiement`

- Récapitulatif : prestation, montant, référence, entrepreneur qui encaisse, mention « TVA non applicable, article 293 B du CGI ».
- Bouton principal « Payer [montant] € en ligne » : une fonction serveur crée une **session Stripe Checkout**.
  - Mode `payment`, devise EUR, une ligne « Allée Nette — [libellé] — réf. [ref] ».
  - Métadonnées : référence et encaisseur.
  - Moyens de paiement gérés depuis le tableau de bord Stripe (à activer par nous) : cartes, Apple Pay, Google Pay, PayPal.
  - Pages de retour : `/paiement/merci?ref=…` et `/paiement?…` en cas d'abandon.
- Bouton secondaire **PayPal** (SDK JavaScript PayPal, création de la commande côté serveur avec l'API Orders), affiché seulement si `PAYPAL_ENABLED=true`. Il sert si PayPal n'est pas activable sur Stripe pour notre compte.
- Bloc « Payer sur place après la prestation » : carte et sans contact, PayPal par QR code, espèces ; facture remise ou envoyée par e-mail.
- Logos officiels des moyens de paiement (CB, Visa, Mastercard, Apple Pay, Google Pay, PayPal), récupérés sur les pages de ressources de marque de chaque émetteur et utilisés selon leurs règles. Ne les redessine pas.
- Texte de réassurance : « Paiement sécurisé par Stripe. Nous ne voyons ni ne conservons vos données bancaires. »

### 10.4 Après le paiement

- Webhook Stripe `checkout.session.completed` (une clé de signature par compte), qui vérifie la signature et envoie un e-mail à l'associé concerné : référence, montant, moyen de paiement.
- Page de remerciement : confirmation, rappel du rendez-vous, et rappel que la facture suit.

### 10.5 Bons cadeaux (phase 2, décembre)

- Achat en ligne via Stripe Checkout à prix fixe : formule × gabarit, ou montant libre de 50 à 300 €.
- Génération d'un code unique, envoi par e-mail d'un bon en PDF élégant (nom du bénéficiaire, message, validité 12 mois).
- Champ « code cadeau » dans la réservation.

### 10.6 Mise en route

- **Stripe en mode test** tant que les micro-entreprises ne sont pas immatriculées. Les clés vivent uniquement dans `.env.local` et dans les variables de l'hébergeur.
- Le README explique pas à pas, pour un débutant :
  - créer les deux comptes Stripe ;
  - activer Apple Pay, Google Pay et PayPal dans le tableau de bord Stripe ;
  - déclarer les webhooks ;
  - passer en mode réel ;
  - et, pour le paiement sur place, les options possibles (terminal de paiement mobile, ou paiement sans contact sur smartphone proposé par plusieurs prestataires).
- Rappelle-moi de vérifier les frais de chaque solution : notre modèle financier compte 1 % de frais de paiement, à ajuster.

---

## 11. Contenus prêts à l'emploi

### 11.1 Accueil

- **Titre** : « Votre voiture propre, sans quitter la maison. »
- **Sous-titre** : « Nettoyage intérieur et extérieur à domicile, à [communes principales de la zone active]. Prix fermes validés sur vos photos avant le rendez-vous. Aucun supplément surprise. »
- **Appel à l'action** : « Réserver mon nettoyage — prix ferme sous 2 heures » ; secondaire : « Voir les tarifs ».
- **Bandeau de réassurance** : Assurance professionnelle · Sans rinçage, aucun rejet d'eau · Photos avant/après le soir même · Retouche gratuite sous 24 h · Paiement après la prestation.
- **Comment ça marche** :
  1. Vous réservez et envoyez 3 photos.
  2. On confirme le prix ferme sous 2 heures.
  3. On vient à l'heure dite avec tout le matériel : il nous faut seulement une prise électrique.
  4. Vous contrôlez avec nous, vous payez après.
- **Pour qui** : familles (sièges enfants, poils d'animaux), actifs pressés (« récupérez votre samedi »), vente ou restitution de location, personnes qui ne peuvent plus aller en station.
- **Qui sommes-nous**, en court : « Deux étudiants entrepreneurs de [ville], formés, assurés et équipés, qui préfèrent bien faire que vite faire. »

### 11.2 Page Le Complet (modèle à décliner pour chaque formule)

- **Le Complet : intérieur et extérieur, chez vous.**
- Pour qui : la voiture familiale ou du quotidien qui a besoin d'un vrai coup de propre, dedans comme dehors.
- Inclus : aspiration complète, tableau de bord et plastiques, contre-portes, seuils, vitres intérieures et extérieures, lavage de la carrosserie sans rinçage, jantes côté visible.
- Non inclus : shampooing des sièges (option dès +25 €), polissage, moteur.
- Durée : 2 h 30 à 3 h. Prix : 109 € citadine, 119 € compacte ou berline, 129 € grand SUV ou monospace.
- Conditions : voiture garée dans votre allée, cour ou garage ; prise électrique à moins de 20 mètres ; pas de pluie annoncée pour l'extérieur.

### 11.3 Questions fréquentes (au minimum)

- **Avez-vous besoin de mon eau ?** Non. Nous apportons notre eau et lavons l'extérieur sans rinçage : environ 10 litres, aucun écoulement.
- **Et de l'électricité ?** Oui, une prise à moins de 20 mètres de la voiture. Nous avons une rallonge de 25 m.
- **Combien de temps ça dure ?** De 1 h 15 pour L'Intérieur Net à 4 h pour Le Grand Soin, selon le gabarit et l'état.
- **Dois-je être présent ?** 5 minutes au début et à la fin. Pensez à retirer vos objets de valeur.
- **Quand est-ce que je paie ?** Après la prestation, sur place, par carte, sans contact (Apple Pay, Google Pay), PayPal ou espèces. Ou en ligne, par lien sécurisé, une fois le prix confirmé.
- **Et s'il pleut ?** L'intérieur reste possible si la voiture est à l'abri. Sinon, nous reportons sans frais.
- **Mon chien perd ses poils, c'est un problème ?** Non : un supplément de 25 ou 45 € selon la quantité, annoncé avant, sur photo.
- **J'habite en copropriété.** C'est possible sur votre place, avec l'accord écrit du syndic ou du règlement.
- **Mes sièges seront-ils mouillés ?** Après un shampooing, oui, quelques heures. Prévoyez de ne pas utiliser la voiture.
- **Et si une tache ne part pas ?** Nous vous disons avant, sur photo, ce qui est récupérable. Une tache ancienne peut seulement s'atténuer.
- **Quelles zones desservez-vous ?** [Communes de la zone active], déplacement inclus jusqu'à 8 km, 10 € de 8 à 15 km.
- **Puis-je annuler ?** Report ou annulation gratuits jusqu'à la veille 18 h. [Règle à confirmer avec moi.]
- **Puis-je offrir une prestation ?** Oui, en bon cadeau valable 12 mois.

### 11.4 Formulations à proscrire

« 100 % écologique », « le meilleur », « n°1 », « certifié », « garanti sans rayure », tout avis inventé, tout chiffre de clients inventé.

---

## 12. Référencement local

- Une balise `<title>` et une meta description uniques par page, construites à partir de la zone active. Exemples :
  - Accueil : « Nettoyage auto à domicile à [Commune 1], [Commune 2], [Commune 3] | Allée Nette » ;
  - description : « On vient chez vous nettoyer votre voiture, intérieur et extérieur sans rinçage. Prix fermes dès 59 €, retouche gratuite sous 24 h. Réservez en 2 minutes. »
- Données structurées JSON-LD :
  - type `AutoWash`, `areaServed` = communes de la zone active, sans adresse de rue publique (entreprise qui se déplace) ;
  - `priceRange` « 59 € – 159 € », `paymentAccepted` « Carte bancaire, Apple Pay, Google Pay, PayPal, Espèces », `currenciesAccepted` « EUR », téléphone, URL, `sameAs` (fiche Google, Instagram) ;
  - `hasOfferCatalog` avec chaque formule et ses prix, généré depuis `data/offres.ts` ;
  - `FAQPage` sur la page FAQ ;
  - **pas de `AggregateRating`**.
- `sitemap.xml`, `robots.txt`, URL canoniques, Open Graph et image de partage générée.
- Contenus en français, balises de titre hiérarchisées, textes alternatifs utiles.
- Nom, téléphone et zone strictement identiques sur le site et sur la fiche Google.

---

## 13. Pages légales (contenu à rédiger, à faire relire)

Crée les pages avec des emplacements visibles `[À COMPLÉTER]` et signale-les dans le README.

### 13.1 Mentions légales

- Pour chacun des deux associés : nom, prénom, mention « EI », adresse, SIREN, e-mail, téléphone.
- Nom commercial « Allée Nette », utilisé par les deux entrepreneurs dans le cadre d'un partenariat, chacun facturant les prestations qu'il réalise.
- Mention « TVA non applicable, article 293 B du CGI ».
- Hébergeur : raison sociale, adresse, téléphone.
- Médiateur de la consommation : nom, adresse, site.

### 13.2 CGV

Articles à prévoir :
- objet ;
- prestations et prix TTC ;
- confirmation du prix ferme sur photos ;
- suppléments acceptés par écrit **avant** le rendez-vous : si la voiture est nettement plus sale que sur les photos, le client choisit entre la formule réservée sans supplément et un report, et aucun supplément n'est imposé sur place ;
- conditions d'intervention : emplacement privé, accord de copropriété, prise électrique, présence du client, météo, restrictions d'eau ;
- zones et déplacement ;
- réservation, report, annulation ;
- paiement : après la prestation ou en ligne après confirmation ; moyens acceptés ; pas d'acompte ;
- droit de rétractation de 14 jours : demande expresse d'exécution anticipée, perte du droit une fois la prestation entièrement exécutée, montant proportionnel si la rétractation intervient après le début, **formulaire type de rétractation en annexe** ;
- garantie Retouche 24 h et ses limites ;
- responsabilité et assurance : état des lieux photo à l'arrivée, objets de valeur retirés par le client, véhicule jamais conduit par nous ;
- réclamations et médiation ;
- données personnelles ;
- droit applicable.

Précise aussi que toute prestation se réserve à distance (site, téléphone, message). Une demande nouvelle faite sur place est programmée pour une autre fois : pour un contrat conclu au domicile du client, la loi interdit tout paiement avant sept jours.

### 13.3 Politique de confidentialité

- Responsables du traitement : les deux entrepreneurs individuels.
- Données collectées : nom, téléphone, e-mail, adresse d'intervention, véhicule, photos, préférences de paiement.
- Finalités et bases légales : exécution du contrat ; intérêt légitime pour le suivi ; consentement pour la prospection.
- Destinataires : les deux associés, l'hébergeur, le service d'envoi d'e-mails, Stripe et PayPal.
- Durées de conservation : 3 ans après le dernier contact ; pièces comptables selon la loi.
- Photos : utilisées pour établir le prix ; publiées seulement avec accord écrit et plaques floutées.
- Droits (accès, rectification, effacement, opposition), contact, réclamation auprès de la CNIL.

### 13.4 Cookies

Avec une mesure d'audience sans cookie et sans contenu tiers intégré (pas d'iframe Google Maps : la carte est en SVG), aucun bandeau n'est nécessaire. Si tu ajoutes un service qui dépose des cookies non essentiels, ajoute un vrai choix « Accepter / Refuser », aussi simple l'un que l'autre.

---

## 14. Mesure et suivi des conversions

Événements, sans cookie :
- `calculateur_utilise`, `reservation_etape_n`, `demande_envoyee` ;
- `clic_whatsapp`, `clic_telephone` ;
- `paiement_initie`, `paiement_reussi`.

Lis les paramètres UTM et les codes (GARAGE, VOISIN, parrain), et transmets la source dans l'e-mail de demande. Prévois une URL courte pour le QR code du garage partenaire (`/garage`, qui redirige vers `/reserver?code=GARAGE` avec la source).

---

## 15. Qualité et critères d'acceptation

### 15.1 Tests

- Vitest : toute la logique de `lib/prix.ts` (cas de la partie 8) et de `lib/paiement.ts` (signature valide, signature falsifiée, lien expiré, montant hors limites).
- Playwright :
  - parcours de réservation complet sur mobile et sur ordinateur ;
  - calculateur ;
  - page de paiement en mode test ;
  - mode mouvement réduit ;
  - captures d'écran à 375, 768, 1 280 et 1 920 px de large.
- axe-core : aucune erreur d'accessibilité critique.
- Lighthouse, mobile :
  - Performance ≥ 90 (85 au minimum avec le héros WebGL, si tu justifies l'écart) ;
  - Accessibilité ≥ 95 ;
  - Bonnes pratiques ≥ 95 ;
  - SEO = 100.

### 15.2 Accessibilité (WCAG 2.2 AA)

- Contrastes conformes et focus clavier visible partout.
- Curseur avant/après et sélecteurs utilisables au clavier, avec libellés ARIA.
- Formulaire avec étiquettes, messages d'erreur clairs et annoncés.
- Canvas décoratifs masqués des lecteurs d'écran ; texte réel derrière chaque effet.

### 15.3 Checklist finale

- [ ] Toutes les formules, options, zones, abonnements et offres de la partie 7 apparaissent, avec les bons prix, depuis une source unique
- [ ] Le calculateur passe tous les tests
- [ ] Réservation de bout en bout : e-mails reçus par les deux associés et par le client
- [ ] Paiement Stripe en mode test : carte, Apple Pay, Google Pay, PayPal ; liens signés vérifiés ; deux encaisseurs
- [ ] Mentions « TVA non applicable, article 293 B du CGI » près des prix, dans le paiement et dans les CGV
- [ ] Aucun avis, chiffre ou photo inventé
- [ ] Mode mouvement réduit et mode dégradé fonctionnels
- [ ] Budgets de performance respectés
- [ ] Pages légales créées, emplacements `[À COMPLÉTER]` listés
- [ ] README pour débutant : modifier un prix, changer de zone, ajouter une photo avant/après, générer un lien de paiement, déployer, passer Stripe en mode réel

---

## 16. Ta façon de travailler

### Étape 0 — Questions bloquantes

Pose-moi au plus 5 questions qui bloquent vraiment le travail. Pour tout le reste, utilise les valeurs de ce brief et des emplacements `[…]`. Questions probables :
- la zone active (`bordeaux` ou `la-rochelle`) et notre point de départ ;
- le nom de marque validé (recherche à l'INPI, nom de domaine disponible) ;
- le téléphone, le numéro WhatsApp et l'e-mail ;
- l'hébergeur choisi ;
- les comptes déjà créés (Stripe, PayPal, Resend).

### Étape 1 — Plan

Arborescence des fichiers, dépendances avec leurs versions et leurs licences, découpage en étapes, choix techniques des effets et leurs solutions de repli. **Attends ma validation.**

### Étapes suivantes

2. Socle : projet, tokens de design, polices, mise en page, navigation, pied de page, SEO de base.
3. Données et calculateur, avec les tests.
4. Pages et contenus.
5. Effets visuels, un par un, avec captures et mesure de performance après chacun.
6. Réservation.
7. Paiement (mode test).
8. Pages légales et mesure d'audience.
9. Recette complète (tests, Lighthouse, accessibilité, captures) et corrections.
10. README et déploiement.

### Règles de travail

- Après chaque étape : un résumé court de ce qui est fait, de ce qui reste et de ce qui m'est demandé, plus des captures d'écran mobile et ordinateur pour toute étape visuelle.
- Vérifie toi-même le rendu des effets dans un navigateur (Playwright) avant de me les présenter ; corrige ce qui saccade, déborde ou masque le texte.
- N'invente jamais un contenu factuel (avis, chiffres, références clients). En cas de doute, laisse un emplacement visible et signale-le.
- Commits petits et explicites.
