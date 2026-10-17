# Paiement en ligne — guide pas à pas

Ce guide explique, pour un débutant, comment mettre en route le paiement en ligne
d'Allée Nette : deux comptes Stripe (un par associé), les clés, les webhooks, les
essais en mode test, PayPal en secours, puis le passage en mode réel. Il servira
de base au README final (étape 10).

> **À retenir.** Rien n'est payé au moment de la demande de réservation. Une fois
> le prix ferme confirmé sur photos, vous envoyez au client un **lien de paiement
> signé**, valable 7 jours. Il paie en ligne, ou sur place après la prestation.

---

## 1. Comment ça marche

```
Administration (/admin/lien-paiement)          Client
  référence, montant, libellé, A ou B             │
          │  lien signé (HMAC), 7 jours             │
          └──── WhatsApp / SMS ───────────────────► /paiement?ref=…&sig=…
                                                    │  le serveur vérifie le lien
                                                    │  « Payer 119,50 € en ligne »
                                                    ▼
                                         Stripe Checkout (compte A ou B)
                                         carte, Apple Pay, Google Pay, PayPal
                                                    │
               webhook /api/stripe/webhook/A ou B ◄─┤
               → e-mail « Paiement reçu » à         │
                 l'associé qui encaisse             ▼
                                         /paiement/merci (état réel du paiement)
```

- **Deux micro-entreprises, deux encaissements.** Chaque associé encaisse sur son
  propre compte Stripe. Le lien porte `encaisseur=A` ou `encaisseur=B` ; la page
  affiche « Paiement à [Prénom Nom] EI, SIREN […] » (renseignez les noms et SIREN
  dans `src/config/site.ts`).
- **Le lien est signé.** Changer la référence, le montant, le libellé, l'encaisseur
  ou la date d'expiration rend le lien invalide : la page refuse alors le paiement
  et propose de vous contacter. Montants acceptés : de 15 € à 600 €.
- **Aucune donnée bancaire ne passe par le site.** Le client paie sur la page
  sécurisée de Stripe. Le site ne conserve rien.
- **PayPal en secours** : un bouton « Payer avec PayPal » peut s'ajouter sous le
  bouton principal, si PayPal n'est pas activable dans Stripe (section 9).
- **Paiement sur place** : toujours proposé sur la page (section 10).

## 2. Ce qu'il vous faut

| Quoi | Pour qui | Où |
| --- | --- | --- |
| Un compte Stripe | Associé A, et un autre pour l'associé B | https://dashboard.stripe.com/register |
| Une clé API restreinte par compte | `STRIPE_API_KEY_A`, `STRIPE_API_KEY_B` | Stripe > Développeurs > Clés API |
| Un webhook par compte | `STRIPE_WEBHOOK_SECRET_A`, `STRIPE_WEBHOOK_SECRET_B` | Stripe > Développeurs > Webhooks |
| Un secret de signature des liens | `PAYMENT_LINK_SECRET` | à générer (section 6) |
| Un mot de passe d'administration | `ADMIN_PASSWORD` | à générer (section 6) |
| (Facultatif) PayPal en secours | `PAYPAL_*` | https://developer.paypal.com |

Toutes ces valeurs se saisissent **uniquement** dans Netlify (et dans `.env.local`
sur votre ordinateur). Jamais dans le code, jamais dans un message. Le fichier
`.env.example` décrit chacune d'elles.

## 3. Créer les deux comptes Stripe

À faire deux fois : une fois par associé, chacun avec sa propre adresse e-mail.

1. Créez le compte sur https://dashboard.stripe.com/register.
2. **Restez en mode test** (interrupteur « Mode test » ou « Environnement de test »
   en haut du tableau de bord) tant que les micro-entreprises ne sont pas
   immatriculées. En mode test, aucun argent réel ne circule.
3. Plus tard, pour encaisser pour de vrai, Stripe vous demandera d'**activer le
   compte** : SIREN, adresse, pièce d'identité, IBAN du compte professionnel.
   Le nom affiché sur le relevé bancaire du client se règle dans
   Paramètres > Informations publiques (mettez « ALLEE NETTE »).

## 4. Créer une clé API restreinte (recommandé)

Une clé restreinte n'a que les droits nécessaires : si elle fuitait, elle ne
permettrait pas de vider le compte.

1. Stripe > **Développeurs > Clés API > Créer une clé restreinte**.
2. Nom : « Site Allée Nette ».
3. Droits à donner (tout le reste sur « Aucun ») :

   | Ressource | Droit | Pourquoi |
   | --- | --- | --- |
   | Checkout Sessions | **Écriture** | créer la page de paiement, relire son état sur /paiement/merci |
   | PaymentIntents | Lecture | lire le moyen de paiement utilisé, pour l'e-mail à l'associé |
   | Charges | Lecture | savoir si le client a payé par Apple Pay ou Google Pay |

4. Copiez la clé (`rk_test_...`) dans Netlify : `STRIPE_API_KEY_A` pour l'associé A
   (`STRIPE_API_KEY_B` pour B).
5. Faites un paiement de test (section 8). Puis, dans **Clés API**, menu « ⋯ » de
   la clé > **Afficher les journaux de requêtes** : si une requête a été refusée
   pour un droit manquant, ajoutez ce droit. Le journal du site (Netlify >
   Logs > Functions) indique alors `StripePermissionError`.

Une clé secrète `sk_test_...` fonctionne aussi, mais elle a tous les droits :
préférez la clé restreinte.

**Garde-fous du site :**

- sans clé pour un encaisseur, la page affiche « Paiement en ligne bientôt
  disponible » et vos contacts, à la place du bouton ;
- avec une clé de test, un bandeau « Mode test : aucun débit réel » s'affiche ;
- une clé réelle (`rk_live_...`, `sk_live_...`) est **refusée** partout ailleurs
  que sur le site de production (aperçus Netlify, ordinateur) : impossible
  d'encaisser depuis une version d'essai ;
- un test automatique (`tests/unit/fuite-cles.test.ts`) échoue si une clé se
  retrouve dans un fichier du dépôt.

## 5. Activer Apple Pay, Google Pay et PayPal dans Stripe

Le site ne choisit pas les moyens de paiement : **tout se règle dans le tableau de
bord**, compte par compte (A puis B), en mode test puis en mode réel.

1. Stripe > **Paramètres > Paiements > Moyens de paiement**.
2. **Cartes** : actives par défaut (CB, Visa, Mastercard).
3. **Apple Pay** et **Google Pay** : activez-les. Avec la page de paiement
   hébergée par Stripe (celle qu'utilise le site), Apple Pay ne demande aucune
   déclaration de domaine. Ils n'apparaissent que sur un appareil compatible,
   avec une carte enregistrée (Safari et iPhone pour Apple Pay, Chrome ou
   Android pour Google Pay).
4. **PayPal** : activez-le s'il est proposé pour votre compte (Stripe peut
   demander d'accepter des conditions ou de relier un compte PayPal). S'il n'est
   pas disponible, utilisez PayPal en secours (section 9).
5. Désactivez ce que vous ne voulez pas proposer (paiement fractionné, etc.).

Les logos affichés sur la page de paiement sont des libellés texte tant que les
fichiers officiels ne sont pas déposés : voir `public/paiement/logos/LISEZMOI.md`.
N'affichez le logo d'un moyen de paiement que s'il est réellement activé sur
**les deux** comptes.

## 6. Variables d'environnement sur Netlify

Netlify > votre site > **Configuration du projet > Environment variables**.
Portée **Builds + Functions** pour toutes, puis **redéployez** (Deploys > Trigger
deploy) : une variable modifiée n'est prise en compte qu'au déploiement suivant.

| Variable | Exemple de forme | Rôle |
| --- | --- | --- |
| `PAYMENT_LINK_SECRET` | 43 caractères aléatoires | signe les liens de paiement |
| `ADMIN_PASSWORD` | 43 caractères aléatoires | mot de passe de /admin/lien-paiement |
| `STRIPE_API_KEY_A`, `STRIPE_API_KEY_B` | `rk_test_...` | compte Stripe de chaque associé |
| `STRIPE_WEBHOOK_SECRET_A`, `STRIPE_WEBHOOK_SECRET_B` | `whsec_...` | vérifie que l'événement vient de Stripe |
| `PAYPAL_ENABLED`, `PAYPAL_ENV`, `PAYPAL_CLIENT_ID_A`… | voir section 9 | PayPal en secours (facultatif) |
| `RESEND_API_KEY`, `RESERVATION_EXPEDITEUR` | déjà en place (réservation) | e-mails « paiement reçu » |
| `NEXT_PUBLIC_SITE_URL` | `https://www.votre-domaine.fr` | adresse des liens et des retours de Stripe |

Générer un secret (dans un terminal) :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

- Prenez **un `PAYMENT_LINK_SECRET` différent pour la production et pour les
  aperçus** (Netlify permet une valeur par contexte de déploiement).
- **Changer `PAYMENT_LINK_SECRET` invalide tous les liens déjà envoyés** : les
  clients concernés verront « Ce lien de paiement n'est pas valide ». Renvoyez-leur
  un lien.
- Aucune de ces variables ne doit commencer par `NEXT_PUBLIC_` (sauf l'adresse du
  site) : elle serait envoyée aux navigateurs.
- Netlify limite la taille totale des variables visibles des fonctions (environ
  4 Ko) : les valeurs ci-dessus tiennent largement.
- **`ADMIN_PASSWORD`** : l'identifiant demandé par le navigateur est libre (par
  exemple « admin »), seul le mot de passe compte. Les tentatives ne sont pas
  limitées : choisissez un mot de passe long et aléatoire (commande ci-dessus).
  Sans valeur, l'administration reste fermée (« Administration non configurée »).
- **`NEXT_PUBLIC_SITE_URL`** est figée au build : les liens générés et les
  retours de Stripe pointent vers cette adresse. Sur un aperçu Netlify, ils
  pointent donc vers l'adresse configurée pour cet aperçu.

## 7. Les webhooks (obligatoires)

Le webhook est la façon dont Stripe prévient le site qu'un client a payé. **Sans
webhook, aucun associé n'est prévenu du paiement** : il n'est pas facultatif.

À faire sur **chaque** compte (A puis B), en mode test puis à nouveau en mode réel :

1. Stripe > **Développeurs > Webhooks > Ajouter une destination**.
2. Adresse :
   - compte de l'associé A : `https://<votre-domaine>/api/stripe/webhook/A`
   - compte de l'associé B : `https://<votre-domaine>/api/stripe/webhook/B`

   (Attention à la lettre : un événement du compte A envoyé sur `/B` est refusé.)
3. Événements à écouter :
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
4. Enregistrez, puis copiez la **clé de signature** (`whsec_...`) dans
   `STRIPE_WEBHOOK_SECRET_A` (ou `_B`). Redéployez.

Ce que fait le site à la réception :

| Événement | Action |
| --- | --- |
| `checkout.session.completed`, paiement reçu | e-mail « Paiement reçu » à l'associé : référence, montant, moyen de paiement (carte, Apple Pay, Google Pay, PayPal…), date, identifiant de session |
| `checkout.session.completed`, paiement différé | rien pour l'instant : l'événement suivant dira s'il a abouti |
| `checkout.session.async_payment_succeeded` | e-mail « Paiement reçu » |
| `checkout.session.async_payment_failed` | e-mail « Paiement échoué » : recontacter le client |
| tout autre événement | ignoré (réponse 200) |

L'e-mail part à l'adresse de l'associé (`site.associes.A.email` ou `.B.email` dans
`src/config/site.ts`), ou à l'adresse générale du site si elle manque. Si l'e-mail
ne part pas, le site répond une erreur à Stripe, qui **réessaie** pendant plusieurs
jours : surveillez Stripe > Webhooks > la destination > **Livraisons**.

**Tester un webhook sur votre ordinateur** (Stripe CLI, https://docs.stripe.com/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook/A
# la commande affiche une clé whsec_... : mettez-la dans .env.local (STRIPE_WEBHOOK_SECRET_A)
```

## 8. Essayer en mode test

1. Générez un lien sur `/admin/lien-paiement` (identifiant au choix, mot de passe
   `ADMIN_PASSWORD`), par exemple 119,50 € pour « Le Complet M », encaisseur A.
2. Ouvrez-le sur votre téléphone : récapitulatif, « Paiement à … », bandeau
   « Mode test », bouton « Payer 119,50 € en ligne ».
3. Sur la page Stripe, utilisez une **carte de test** (date d'expiration future
   quelconque, CVC quelconque) :

   | Carte | Résultat |
   | --- | --- |
   | `4242 4242 4242 4242` | paiement accepté |
   | `4000 0025 0000 3155` | validation 3-D Secure demandée (acceptez dans la fenêtre) |
   | `4000 0000 0000 9995` | refusée : fonds insuffisants |
   | `4000 0000 0000 0002` | refusée par la banque |

   Liste complète : https://docs.stripe.com/testing
4. Vérifiez : arrivée sur `/paiement/merci` avec « Merci, paiement reçu » ; dans
   Stripe > Paiements, le paiement de test avec la référence en métadonnée ; dans
   Webhooks > Livraisons, une réponse 200 ; l'e-mail « [TEST] Paiement reçu » chez
   l'associé (sans clé Resend hors production, le site est en mode démonstration :
   l'e-mail est seulement écrit dans le journal).
5. Testez aussi : le bouton « Retour » de Stripe (retour au lien d'origine), un
   lien modifié à la main (refusé), un lien de plus de 7 jours (refusé).

## 9. PayPal en secours (facultatif)

À utiliser seulement si PayPal n'est pas activable dans Stripe (section 5). Le
bouton « Payer avec PayPal » s'affiche alors sous le bouton principal. Le module
PayPal n'est chargé qu'après un clic du client (aucun script ni cookie PayPal
avant).

1. Chaque associé crée un compte **PayPal Business**.
2. Sur https://developer.paypal.com > **Apps & Credentials**, onglet **Sandbox** :
   créez une application REST, copiez le **Client ID** et le **Secret**.
3. Netlify : `PAYPAL_ENABLED=true`, `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID_A`,
   `PAYPAL_CLIENT_SECRET_A` (et `_B` pour l'associé B). Redéployez.
4. Testez avec un **compte acheteur sandbox** (Developer > Sandbox accounts).
5. Pour le réel : onglet **Live**, nouvelles valeurs, `PAYPAL_ENV=live`
   (refusé hors production).

La commande PayPal est créée et encaissée par le serveur, au montant du lien
vérifié ; la référence sert de numéro de facture PayPal, ce qui empêche de payer
deux fois le même lien. Après un paiement PayPal, l'associé reçoit le même e-mail
« Paiement reçu ».

## 10. Paiement sur place

La page de paiement rappelle toujours qu'on peut payer après la prestation :
carte et sans contact (Apple Pay, Google Pay) sur un terminal mobile, PayPal par
QR code, espèces contre facture. Options possibles, à comparer :

- **Terminal de paiement mobile** relié à votre téléphone en Bluetooth (plusieurs
  prestataires en proposent, avec ou sans abonnement).
- **Paiement sans contact sur smartphone**, sans terminal : le téléphone de
  l'associé sert de terminal (offre proposée par plusieurs prestataires, dont
  Stripe ; vérifiez la compatibilité de votre téléphone).
- **PayPal par QR code** : depuis l'application PayPal Business.
- **Espèces** : remettez toujours une facture.

## 11. Passer en mode réel

Quand les micro-entreprises sont immatriculées :

1. Activez chaque compte Stripe (section 3, point 3).
2. Refaites en **mode réel** : clé restreinte `rk_live_...` (section 4), moyens de
   paiement (section 5), webhooks et leurs nouvelles clés `whsec_...` (section 7).
3. Sur Netlify, remplacez les valeurs **pour le contexte Production uniquement** ;
   gardez les clés de test pour les aperçus.
4. Redéployez la production, puis faites un vrai paiement de faible montant
   (15 €), vérifiez l'e-mail et le webhook, et remboursez-le depuis Stripe.
5. Renseignez les noms et SIREN des associés dans `src/config/site.ts` : la page
   affiche sinon « [À COMPLÉTER] ».

## 12. Les frais : à vérifier

**Notre modèle financier compte 1 % de frais de paiement : c'est probablement trop
peu.** Les frais de chaque solution sont publics, mais changent : vérifiez-les
avant de choisir, et ajustez le modèle.

- Stripe : https://stripe.com/fr/pricing. À la rédaction, le tarif standard pour
  une carte européenne était de l'ordre de 1,5 % + 0,25 € par paiement, soit
  environ 2 € (1,7 %) sur 119 € : **à vérifier**. Apple Pay, Google Pay et PayPal
  via Stripe ont leurs propres tarifs.
- PayPal en direct : grille « Commerçants » de PayPal, souvent plus chère que la
  carte.
- Terminal sur place : prix du terminal ou abonnement, et commission par
  paiement.

## 13. En cas de souci

| Ce que vous voyez | Cause probable | Que faire |
| --- | --- | --- |
| « Paiement en ligne bientôt disponible » | clé Stripe absente pour cet encaisseur, ou clé réelle sur un aperçu | ajouter `STRIPE_API_KEY_A`/`B`, redéployer |
| « Ce lien de paiement n'est pas valide » | lien modifié, coupé, ou `PAYMENT_LINK_SECRET` changé | générer un nouveau lien |
| « Ce lien de paiement a expiré » | plus de 7 jours | générer un nouveau lien |
| « Paiement en ligne momentanément indisponible » | `PAYMENT_LINK_SECRET` absent ou trop court | l'ajouter (32 caractères au moins), redéployer |
| « Le paiement n'a pas pu démarrer » | Stripe a refusé la création (droit manquant, clé révoquée) | journal Netlify : `StripePermissionError`, `StripeAuthenticationError`… |
| Pas d'e-mail « Paiement reçu » | webhook absent, mauvaise adresse (A/B), mauvaise clé `whsec_`, Resend non configuré | Stripe > Webhooks > Livraisons ; journal Netlify `[paiement]` |
| Administration : « Administration non configurée » | `ADMIN_PASSWORD` absent | l'ajouter, portée Builds + Functions |

Les journaux du site ne contiennent jamais de clé, ni de donnée bancaire, ni de
coordonnée du client : seulement la référence, l'encaisseur et des codes d'erreur.

## 14. Ce qui n'a pas pu être vérifié

Le site a été développé dans un environnement sans accès à Stripe ni à PayPal :
tout est testé avec des clients simulés (tests Vitest et Playwright), **aucun vrai
paiement n'a été effectué**. Avant d'ouvrir le paiement aux clients, faites
vous-même les essais de la section 8, sur les deux comptes, puis le paiement réel
de la section 11.
