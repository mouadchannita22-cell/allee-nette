# Mesure d'audience sans cookie — Umami

Ce guide explique comment mettre en route la mesure d'audience d'Allée Nette, ce
qu'elle compte (et ne compte pas), et comment lire les résultats, dont la
provenance des visites (paramètres UTM et codes).

> **À retenir.** La mesure est **éteinte par défaut** : tant que la variable
> `NEXT_PUBLIC_UMAMI_WEBSITE_ID` est vide, le site ne charge aucun script de
> mesure. Une fois allumée, elle **ne dépose aucun cookie** : pas de bandeau à
> afficher (à faire confirmer par le relecteur juridique, voir
> `docs/a-completer.md`). Ce qui part vers Umami ne contient ni nom, ni
> coordonnées, ni référence de demande.

Pourquoi Umami : il compte les pages vues **et des événements personnalisés**
(étapes de la réservation, paiements…), sans cookie. Cloudflare Web Analytics,
envisagé au départ, ne gère pas les événements personnalisés (`docs/PLAN.md`,
ajustement 3).

---

## 1. Comment ça marche

- **Composant** : `src/components/layout/MesureAudience.tsx`, monté une fois dans
  le layout. Sans identifiant, il ne rend rien et son chargeur est retiré du
  JavaScript envoyé au navigateur (`next.config.ts` inscrit l'identifiant au
  build, même vide, ce qui permet de supprimer ce code).
- **Chargement tardif** : le script Umami est ajouté **après le chargement
  complet de la page** (événement `load`), quand le navigateur est au repos
  (`src/components/layout/ScriptUmami.tsx`, quelques lignes plutôt que
  `next/script`, plus lourd). Il n'est pas préchargé : il ne retarde ni
  l'affichage de la page (LCP) ni le JavaScript du site.
- **Seul le vrai domaine compte** (`data-domains`) : le domaine de
  `NEXT_PUBLIC_SITE_URL`. Les aperçus Netlify (`deploy-preview-…`) et le site
  lancé sur votre ordinateur ne sont pas comptés, tant que cette variable vaut
  l'adresse publique dans tous les contextes Netlify.
- **Adresses sans paramètres** (`data-exclude-search`, `data-exclude-hash`) :
  `/reserver/merci?ref=AN-2026-0042` part comme `/reserver/merci`, et la page de
  paiement sans sa signature. Un filtre (`data-before-send`, fonction
  `preparerEnvoiUmami` de `src/lib/umami.ts`) y remet **seulement** les
  paramètres de campagne `utm_…` de la page, et n'envoie rien depuis
  l'administration (`/admin/…`). Si la version d'Umami utilisée ne connaissait pas
  ce filtre, les adresses partiraient simplement sans aucun paramètre (rien de
  plus).
- **Événements** : `src/lib/analytics.ts` (`suivre()`). Un événement émis avant
  l'arrivée du script (par exemple l'étape 1 de la réservation, affichée dès
  l'ouverture de la page) attend en mémoire de la page et part à son arrivée.
  Sans script (variable vide, bloqueur de publicité, réseau coupé), rien ne
  se passe et le site fonctionne à l'identique.
- **Clics vers le téléphone et WhatsApp** : une seule écoute pour tout le site
  (`src/components/layout/ScriptUmami.tsx`). Tout lien `tel:` ou WhatsApp est
  compté, où qu'il soit (barre mobile, pied de page, contacts, pages légales…),
  sans qu'un composant ait à s'en occuper.

## 2. Mise en route

### A. Créer le site dans Umami

**Umami Cloud** (le plus simple) : créez un compte sur [umami.is](https://umami.is).
Une offre gratuite existe ; **revérifiez ses conditions avant de choisir** (nombre
d'événements par mois, nombre de sites, durée de conservation des données, pays
d'hébergement). Si un choix de région d'hébergement des données vous est proposé,
préférez l'Union européenne.

**Ou auto-hébergement** : Umami est un logiciel libre, installable sur votre
propre serveur avec une base de données (voir sa documentation). Il faut alors
l'entretenir (mises à jour, sauvegardes) : à réserver à quelqu'un d'à l'aise.

Dans Umami, ajoutez un site web :

- nom : `Allée Nette` ;
- domaine : celui du site, **sans** `https://` (par exemple `www.allee-nette.fr`),
  le même que dans `NEXT_PUBLIC_SITE_URL`.

Puis copiez l'**identifiant du site** (« Website ID », une suite comme
`1f2e3d4c-…`) dans les réglages du site. Il est public : il apparaît dans les pages.

### B. Le donner au site (Netlify)

Dans **Project configuration → Environment variables**, portée **Builds** :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | l'identifiant copié dans Umami |
| `NEXT_PUBLIC_UMAMI_SRC` | à laisser vide pour Umami Cloud (`https://cloud.umami.is/script.js` par défaut) ; pour un Umami auto-hébergé, l'adresse de son script, par exemple `https://stats.votre-domaine.fr/script.js` |

Vérifiez aussi que `NEXT_PUBLIC_SITE_URL` est bien l'adresse publique définitive
(c'est elle qui donne le domaine compté). Puis **redéployez** (Deploys → Trigger
deploy) : ces valeurs sont inscrites au moment du build.

En local, mettez les mêmes lignes dans `.env.local` si vous voulez essayer ; sans
`NEXT_PUBLIC_SITE_URL`, le domaine compté est alors `localhost`.

### C. Vérifier

1. Ouvrez le site public sur votre téléphone, puis la vue « temps réel » d'Umami :
   votre visite apparaît en quelques secondes.
2. Sur ordinateur, outils de développement → onglet **Réseau** : `script.js`
   n'arrive qu'après le chargement de la page ; onglet **Application → Cookies** :
   aucun cookie.
3. Utilisez le calculateur sur /tarifs : l'événement `calculateur_utilise`
   apparaît dans Umami.

**Ne pas compter vos propres visites** : Umami prévoit pour cela un réglage dans
la mémoire du navigateur (`umami.disabled`, voir sa documentation, rubrique
« exclude my own visits »), à faire sur chacun de vos appareils.

**Arrêter la mesure** : videz `NEXT_PUBLIC_UMAMI_WEBSITE_ID` et redéployez.

## 3. Les événements (partie 14 du brief)

| Événement | Quand il part | Données jointes | Ce qu'il mesure |
| --- | --- | --- | --- |
| `calculateur_utilise` | à la première interaction avec un calculateur, **une seule fois par visite** : calculateur de prix (accueil, /tarifs) ou vérificateur « Êtes-vous dans notre zone ? » | `outil` : `calculateur` ou `zones` | l'intérêt pour les prix et la zone |
| `reservation_etape_1` … `reservation_etape_7` | à l'affichage de chaque étape de /reserver, une fois par étape (revenir en arrière ne recompte pas) | aucune | où les visiteurs abandonnent la réservation |
| `demande_envoyee` | quand le serveur a accepté la demande, juste avant la page de remerciement | aucune | les demandes de réservation (la conversion principale) |
| `clic_telephone` | à chaque clic sur un lien d'appel (`tel:`) du site | aucune | les contacts par téléphone |
| `clic_whatsapp` | à chaque clic sur un lien WhatsApp du site | aucune | les contacts par WhatsApp |
| `paiement_initie` | clic sur « Payer … en ligne » (Stripe) ou sur le bouton PayPal | `moyen` : `stripe` ou `paypal` | les paiements en ligne commencés |
| `paiement_reussi` | sur /paiement/merci, quand le serveur a confirmé le paiement, une seule fois par paiement (même après un rechargement) | `moyen` : `stripe` ou `paypal` | les paiements en ligne aboutis |

Aucune autre donnée ne peut accompagner un événement : le code le refuse
(type `DonneesEvenement` de `src/lib/analytics.ts`, vérifié par les tests).

**Lecture conseillée** : visites → `calculateur_utilise` → `reservation_etape_1`
→ … → `reservation_etape_7` → `demande_envoyee`. Une forte baisse entre deux
étapes montre l'étape à simplifier. `paiement_initie` sans `paiement_reussi` :
paiement abandonné ou refusé (le détail est dans Stripe ou PayPal, pas dans
Umami). Un clic vers le téléphone ou WhatsApp est souvent une demande passée
autrement : lisez-les avec `demande_envoyee`.

## 4. D'où viennent les clients : UTM et codes

Deux endroits, complémentaires :

1. **Dans chaque e-mail de demande** (le plus fiable) : la rubrique « Source de
   la visite » donne `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`,
   `utm_content`, le **code** du lien (GARAGE, VOISIN, code de parrainage) et le
   site d'origine. Ces informations sont captées à la première page de la visite,
   gardées en mémoire de la page seulement (ni cookie, ni stockage) et envoyées
   avec la demande (`src/lib/source-visite.ts`).
2. **Dans Umami** : la provenance des visites (sites d'origine) et, grâce au
   filtre décrit plus haut, les campagnes UTM. Les **codes ne partent pas** vers
   Umami : un code de parrainage est la référence de la demande du parrain.

Pour suivre un support, ajoutez des paramètres UTM au lien imprimé ou partagé :

| Support | Lien à utiliser |
| --- | --- |
| QR code du garage partenaire | `https://votre-domaine/garage` : redirige vers `/reserver?code=GARAGE&utm_source=garage&utm_medium=qr` |
| Flyer dans les boîtes aux lettres | `https://votre-domaine/?utm_source=flyer&utm_medium=papier&utm_campaign=lancement` |
| Lien envoyé à un voisin | `https://votre-domaine/reserver?code=VOISIN&utm_source=voisin&utm_medium=bouche-a-oreille` |
| Publication Instagram | `https://votre-domaine/?utm_source=instagram&utm_medium=social` |

Gardez des valeurs courtes, en minuscules, toujours écrites de la même façon :
`flyer` et `Flyer` seraient comptés comme deux sources.

## 5. Données personnelles

- **Aucun cookie.** Un seul stockage dans le navigateur sert la mesure :
  l'identifiant d'un paiement réussi, gardé pour ne le compter qu'une fois
  (aucune coordonnée). La politique de confidentialité
  (`src/content/confidentialite.mdx`, rubrique « Cookies et traceurs ») décrit la
  mesure telle qu'elle est.
- Reste à confirmer, selon l'offre choisie : les données techniques qu'Umami
  collecte et leur durée de conservation, et le pays d'hébergement (emplacements
  `[À CONFIRMER]` et `[À COMPLÉTER]` de la politique de confidentialité, voir
  `docs/a-completer.md`).

## 6. Tests

- `npm test` : `tests/unit/mesure-audience.test.ts` (suivre(), file d'attente,
  configuration, filtre d'envoi) et `tests/unit/mesure-evenements.test.ts`
  (chaque événement branché à un seul endroit, liens de contact reconnus).
- `npx playwright test tests/e2e/mesure.spec.ts` (après `npm run build`) : aucun
  cookie ni requête vers un site tiers sur l'accueil, /reserver et /paiement ;
  `calculateur_utilise` une seule fois ; /garage ouvre la réservation avec le
  code GARAGE (la source envoyée avec la demande est vérifiée dans
  `tests/e2e/reservation.spec.ts`).
- Le chargement du script lui-même se vérifie avec un identifiant factice défini
  **au build et aux tests** (la requête vers Umami est interceptée, rien ne part) :

  ```bash
  NEXT_PUBLIC_UMAMI_WEBSITE_ID=e2e-umami npm run build
  NEXT_PUBLIC_UMAMI_WEBSITE_ID=e2e-umami npx playwright test tests/e2e/mesure.spec.ts
  ```

  Sans cette variable, ces tests sont indiqués comme ignorés. Refaites ensuite un
  `npm run build` normal avant de lancer le site.
