# À compléter et à confirmer avant l'ouverture

Le site affiche deux sortes d'emplacements visibles tant qu'une information manque :

- **`[À COMPLÉTER : …]`** : une information qui nous manque (nom, adresse, numéro…). La plupart disparaissent dès que la valeur est renseignée dans `src/config/site.ts`.
- **`[À CONFIRMER : …]`** : une règle ou une affirmation écrite, mais pas encore validée (par les associés ou par un professionnel du droit).

Cette liste les recense tous, page par page. Elle est tenue à la main et vérifiée par un test (`tests/unit/a-completer.test.ts`) : il échoue si le site affiche un emplacement absent d'ici, si une valeur vide de `src/config/site.ts` n'y figure pas, ou si une ligne d'ici ne correspond plus à rien.

**Où en est-on ?** `npm run a-completer` liste les valeurs encore vides de `src/config/site.ts`, avec, pour chacune, où trouver l'information (colonne de droite des tableaux ci-dessous).

Après chaque changement : redéployez (les valeurs sont lues au build), puis relisez les trois pages légales.

## 1. Valeurs de `src/config/site.ts`

Une valeur vide (`""`) s'affiche en emplacement ; renseignée, elle apparaît partout d'un coup (pages, e-mails, données structurées).

### Contacts communs

| Valeur à renseigner | Emplacement affiché tant qu'elle est vide | Où il apparaît | Où trouver l'information |
| --- | --- | --- | --- |
| `site.telephone` | **Renseigné** : 06 11 02 48 56 (18/10/2026) | pied de page, /a-propos, pages légales, réservation, remerciement, paiement, e-mail au client | — |
| `site.whatsapp` | **Renseigné** : même numéro, 33611024856 (18/10/2026) — vérifiez que WhatsApp est bien actif sur ce numéro | pied de page, /a-propos, réservation, remerciement, calculateur, paiement, e-mail au client | — |
| `site.email` | `[À COMPLÉTER : e-mail]` | pied de page, /a-propos, /mentions-legales, /cgv et /confidentialite (contacts), contacts de la réservation et du paiement, e-mail au client | L'adresse de contact commune, sur votre domaine de préférence (`contact@…`). Elle sert aussi d'adresse de réponse des e-mails envoyés aux clients. |
| `site.villeAssocies` | `[À COMPLÉTER : votre ville]` | accueil (« Qui sommes-nous »), /a-propos | La ville d'où vous venez, telle que vous voulez la présenter (« Deux étudiants entrepreneurs de … »). |

### Les deux associés (`site.associes.A` et `site.associes.B`)

Chaque associé est un entrepreneur individuel (EI) qui facture ses propres prestations. Les e-mails des associés reçoivent aussi les demandes de réservation et les avis de paiement : **sans eux, aucune demande n'arrive en production**.

| Valeur à renseigner | Emplacement affiché tant qu'elle est vide | Où il apparaît | Où trouver l'information |
| --- | --- | --- | --- |
| `site.associes.A.prenomNom` | `[À COMPLÉTER : nom de l'associé A]` | /mentions-legales, /cgv, /confidentialite, page de paiement, administration des liens de paiement, e-mails de paiement | Prénom et nom exactement comme sur l'attestation d'immatriculation de l'entreprise. |
| `site.associes.B.prenomNom` | `[À COMPLÉTER : nom de l'associé B]` | idem | idem |
| `site.associes.A.siren` | `[À COMPLÉTER : SIREN de l'associé A]` | /mentions-legales, page de paiement | Le numéro à 9 chiffres de l'avis de situation au répertoire SIRENE (Insee), aussi sur l'attestation d'immatriculation. |
| `site.associes.B.siren` | `[À COMPLÉTER : SIREN de l'associé B]` | idem | idem |
| `site.associes.A.immatriculation` | `[À COMPLÉTER : registre d'immatriculation de l'associé A]` | /mentions-legales | Le registre indiqué sur l'attestation reçue à la création de l'entreprise, recopié tel quel. |
| `site.associes.B.immatriculation` | `[À COMPLÉTER : registre d'immatriculation de l'associé B]` | idem | idem |
| `site.associes.A.adresse` | `[À COMPLÉTER : adresse de l'associé A]` | /mentions-legales, /cgv (formulaire de rétractation), /confidentialite (exercice des droits) | L'adresse de l'entreprise déclarée à la création (attestation d'immatriculation, avis de situation). |
| `site.associes.B.adresse` | `[À COMPLÉTER : adresse de l'associé B]` | idem | idem |
| `site.associes.A.email` | `[À COMPLÉTER : e-mail de l'associé A]` | /mentions-legales, /cgv (formulaire de rétractation), /confidentialite ; destinataire des demandes et des paiements | Une adresse professionnelle que l'associé lit chaque jour. |
| `site.associes.B.email` | `[À COMPLÉTER : e-mail de l'associé B]` | idem | idem |
| `site.associes.A.telephone` | `[À COMPLÉTER : téléphone de l'associé A]` | /mentions-legales | Le numéro professionnel de l'associé. |
| `site.associes.B.telephone` | `[À COMPLÉTER : téléphone de l'associé B]` | idem | idem |

### Assurance, hébergeur, médiateur

| Valeur à renseigner | Emplacement affiché tant qu'elle est vide | Où il apparaît | Où trouver l'information |
| --- | --- | --- | --- |
| `site.assurance.assureur` | `[À COMPLÉTER : assureur]` | /a-propos, /mentions-legales, /cgv (responsabilité et assurance) | L'attestation d'assurance responsabilité civile professionnelle. La configuration ne prévoit qu'un contrat : s'il y en a un par associé, il faudra un champ par associé. |
| `site.assurance.numeroContrat` | `[À COMPLÉTER : numéro de contrat]` | idem | idem |
| `site.hebergeur.raisonSociale` | `[À COMPLÉTER : raison sociale de l'hébergeur]` (seulement si on vide la valeur) | /mentions-legales, /confidentialite | Déjà renseignée (« Netlify, Inc. ») ; à vérifier sur les conditions d'utilisation de Netlify si l'hébergeur change. |
| `site.hebergeur.adresse` | `[À COMPLÉTER : adresse de l'hébergeur]` | /mentions-legales | Les conditions d'utilisation ou la page « contact » du site de l'hébergeur : recopier l'adresse telle qu'il l'indique. |
| `site.hebergeur.telephone` | `[À COMPLÉTER : téléphone de l'hébergeur]` | /mentions-legales | Comme l'adresse : conditions d'utilisation ou page « contact » de l'hébergeur. S'il ne publie aucun numéro, le faire vérifier par le relecteur juridique. |
| `site.mediateur.nom` | `[À COMPLÉTER : nom du médiateur de la consommation]` | /mentions-legales, /cgv (réclamations et médiation) | Après l'adhésion à un médiateur de la consommation (obligatoire, souvent payante) : son contrat ou son attestation d'adhésion. Liste des médiateurs référencés : site de la Commission d'évaluation et de contrôle de la médiation de la consommation (economie.gouv.fr). |
| `site.mediateur.adresse` | `[À COMPLÉTER : adresse du médiateur]` | /mentions-legales, /cgv | Idem. |
| `site.mediateur.site` | `[À COMPLÉTER : site du médiateur]` | /mentions-legales, /cgv | Le contrat ou l'attestation d'adhésion au médiateur : l'adresse du site où le client dépose sa demande. |

### Règle à confirmer

| Valeur à changer | Emplacement affiché | Où il apparaît | Comment le lever |
| --- | --- | --- | --- |
| `site.annulation.confirmee` (vaut `false`) | `[À CONFIRMER : règle de report et d'annulation]` ; `[À CONFIRMER]` à côté de la question « Puis-je annuler ? » | /cgv (article « Réservation, report et annulation »), /faq ; la règle est aussi retirée des données structurées de la FAQ | Les associés valident `site.annulation.texte` (« jusqu'à la veille 18 h »), le relecteur juridique aussi, puis passez `confirmee` à `true`. |

### Valeurs sans emplacement visible

Vides, elles ne montrent rien (l'élément est simplement masqué) ; à renseigner quand elles existent.

| Valeur à renseigner | Effet tant qu'elle est vide | Où trouver l'information |
| --- | --- | --- |
| `site.reseaux.instagram` | absente des données structurées | L'adresse du compte Instagram. |
| `site.reseaux.ficheGoogle` | absente des données structurées | Le lien « Partager » de la fiche Google Business Profile. |
| `site.avisGoogle.lien` | la page /avis reste fermée (comme tant que `site.avisGoogle.nombre` est sous 5) | Le lien vers les avis de la fiche Google ; mettre à jour `nombre` à la main. |

## 2. Réglages des pages légales (`src/data/legal.ts`)

| Valeur à changer | Emplacement affiché | Où il apparaît | Comment le lever |
| --- | --- | --- | --- |
| `RELECTURE_JURIDIQUE.faite` (vaut `false`) | `[À CONFIRMER : texte à faire relire par un professionnel du droit avant l'ouverture du site]` | en tête de /mentions-legales, /cgv et /confidentialite | Faire relire les trois textes par un professionnel du droit (avocat, juriste), appliquer ses corrections, puis passer `faite` à `true`. |
| `MISES_A_JOUR` | aucun (date affichée sous le titre) | /mentions-legales, /cgv, /confidentialite | À changer à la main à chaque modification d'un texte (format `AAAA-MM-JJ`). |

## 3. Emplacements écrits dans les textes (`src/content/*.mdx`)

Ils ne dépendent d'aucune valeur de configuration : une fois l'information obtenue, remplacez l'emplacement par la phrase définitive dans le fichier indiqué.

| Fichier | Emplacement affiché | Où trouver l'information |
| --- | --- | --- |
| `src/content/cgv.mdx` (article « Réservation, report et annulation ») | `[À CONFIRMER : conséquences d'une annulation tardive ou d'une absence au rendez-vous]` | Décision des associés (rien, frais de déplacement, autre ?), à faire valider par le relecteur juridique : une clause trop lourde pour le client peut être jugée abusive. |
| `src/content/confidentialite.mdx` (responsables du traitement) | `[À CONFIRMER : accord écrit entre les deux associés, dont l'essentiel doit vous être communiqué]` | Un accord écrit entre les deux associés, responsables conjoints, qui répartit leurs obligations (qui répond aux demandes d'accès, qui gère les incidents…) ; modèle à demander au relecteur juridique. Puis résumer ici l'essentiel de cet accord. |
| `src/content/confidentialite.mdx` (fonctionnement du site) | `[À CONFIRMER : données techniques conservées par l'hébergeur dans ses journaux, et leur durée]` | La politique de confidentialité et l'accord de traitement des données (« Data Processing Agreement ») de Netlify, pour l'offre utilisée. |
| `src/content/confidentialite.mdx` (destinataires) | `[À COMPLÉTER : fournisseur des boîtes e-mail des associés]` | Le service qui héberge les boîtes des associés (celui de leur adresse e-mail). |
| `src/content/confidentialite.mdx` (destinataires) | `[À COMPLÉTER : vérifier pour chaque prestataire le pays d'hébergement et le mécanisme d'encadrement des transferts]` | Pour Netlify, Resend, Stripe, PayPal, Umami et le fournisseur des boîtes e-mail : leur accord de traitement des données et leur politique de confidentialité (pays d'hébergement, adhésion au Data Privacy Framework, clauses contractuelles types). Écrire le résultat prestataire par prestataire. |
| `src/content/confidentialite.mdx` (cookies et traceurs) | `[À CONFIRMER : données techniques collectées par l'offre Umami retenue et leur durée de conservation]` | La documentation et la politique de confidentialité d'Umami pour l'offre choisie (Umami Cloud ou auto-hébergement) : voir `docs/mesure-audience.md`. |
| `src/content/confidentialite.mdx` (cookies et traceurs) | `[À CONFIRMER : ces deux stockages relèvent bien des exceptions au consentement]` | Les lignes directrices de la CNIL sur les cookies et autres traceurs (cnil.fr), pour les deux informations gardées dans la mémoire du navigateur : le réglage du curseur et l'identifiant d'un paiement réussi. À faire trancher par le relecteur juridique. |

## 4. À fournir aussi avant l'ouverture (sans emplacement entre crochets)

- **Variables d'environnement** sur Netlify (adresse du site, Resend, paiement, Umami) : voir le `README.md`, `docs/paiement.md` et `docs/mesure-audience.md`.
- **Photos avant/après** : « Photo à venir » tant que `src/data/realisations.ts` n'a pas ses photos (les vôtres, avec l'accord écrit du client, plaques floutées).
- **Logos officiels des moyens de paiement** : un libellé texte s'affiche tant qu'ils manquent dans `public/paiement/logos/` (voir le `LISEZMOI.md` du dossier).
