# Logos officiels des moyens de paiement

La page `/paiement` affiche les logos des moyens de paiement acceptés en ligne
(partie 10.3 du brief). Ils doivent être **les fichiers officiels**, téléchargés
sur les pages de ressources de marque de chaque émetteur, et utilisés selon
leurs règles. **Ne les redessinez jamais** et ne les modifiez pas (couleurs,
proportions, recadrage).

Tant qu'un fichier manque, la page affiche à sa place un libellé texte sobre
(« Visa », « PayPal »…). Rien ne casse.

## Comment ajouter un logo

1. Téléchargez le fichier officiel (lien ci-dessous). Certaines pages demandent
   de créer un compte ou d'accepter des conditions d'utilisation : lisez-les.
2. Renommez-le exactement comme dans le tableau, en gardant son format :
   `.svg` de préférence, sinon `.png` ou `.webp`.
3. Déposez-le dans ce dossier (`public/paiement/logos/`).
4. Redéployez le site : les fichiers présents sont relevés au moment du build
   (`next.config.ts`).

| Moyen de paiement | Nom du fichier   | Où le télécharger (site officiel de l'émetteur)                                                     |
| ----------------- | ---------------- | ---------------------------------------------------------------------------------------------------- |
| CB                | `cb.svg`         | GIE Cartes Bancaires, https://www.cartes-bancaires.com : marque d'acceptation CB, ou via votre banque |
| Visa              | `visa.svg`       | Visa, https://www.visa.fr : « Brand Center » (marques d'acceptation)                                  |
| Mastercard        | `mastercard.svg` | Mastercard Brand Center, https://brand.mastercard.com                                                 |
| Apple Pay         | `apple-pay.svg`  | Apple Pay Marketing Guidelines, https://developer.apple.com/apple-pay/marketing/                      |
| Google Pay        | `google-pay.svg` | Google Pay Brand Guidelines, https://developers.google.com/pay/api/web/guides/brand-guidelines        |
| PayPal            | `paypal.svg`     | PayPal Logo Center, https://www.paypal.com/fr/webapps/mpp/logo-center                                 |

Ces adresses n'ont pas pu être ouvertes depuis l'environnement de
développement (sans accès à Internet) et changent parfois : si l'une ne répond
plus, cherchez « brand center » ou « logo guidelines » suivi du nom de la
marque, **sur le site officiel de l'émetteur uniquement**.

## Règles d'usage à respecter (résumé, à vérifier sur chaque page)

- **Fichier intact** : pas de déformation, de changement de couleur, d'ombre
  ni d'animation. Utilisez la version prévue pour un fond clair (la page de
  paiement a un fond blanc).
- **Zone de protection** : chaque marque impose un espace libre autour du logo.
  La page laisse une marge autour de chaque logo ; augmentez-la si la règle
  de la marque l'exige.
- **Taille minimale** : la page affiche les logos à 20 px de haut. Si une
  marque exige plus, ajustez `h-5` dans `src/components/paiement/LogosPaiement.tsx`.
- **Apple Pay et Google Pay** : n'affichez leur logo que si le moyen de paiement
  est réellement activé sur les deux comptes Stripe (voir `docs/paiement.md`).
- **CB, Visa, Mastercard** : utilisez les marques d'acceptation (« acceptance
  marks »), pas les logos d'entreprise.
- **PayPal** : utilisez le logo d'acceptation proposé dans le Logo Center.

Le texte alternatif de chaque image (« Visa », « PayPal »…) est déjà prévu
dans `src/data/paiement.ts` (`LOGOS_PAIEMENT`).
