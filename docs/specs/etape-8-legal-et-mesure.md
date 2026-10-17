# Étape 8 — Pages légales et mesure d'audience

Références : docs/brief.md parties 13 (pages légales), 14 (mesure et suivi des conversions), 2.2 (honnêteté), 6 (architecture) ; docs/PLAN.md ajustements 2 (CGV et mentions en MDX) et 3 (Umami).

Ces textes sont des projets à faire relire par un professionnel : rédige-les avec soin, en droit français à jour, sans rien inventer. Toute information que nous n'avons pas s'affiche en emplacement visible `[À COMPLÉTER : …]` (fonction `ouACompleter` / composant ACompleter), et toute règle à confirmer en `[À CONFIRMER : …]`. Ne cite un article de loi que si tu es sûr de son numéro et de son contenu.

## 1. Mise en place MDX
- Configure @next/mdx (déjà installé, version 16.4) selon node_modules/next/dist/docs (guide MDX et `mdx-components.tsx`), compatible Turbopack (options sérialisables) et cacheComponents. Les textes longs vivent dans `src/content/*.mdx`.
- Les valeurs de configuration (associés, SIREN, adresses, hébergeur, médiateur, assurance, zone, prix, délais, CONDITIONS, GARANTIE, OFFRES, règle d'annulation et son état « confirmée ») sont injectées depuis src/config/site.ts et src/data/*.ts par de petits composants importés dans le MDX : jamais recopiées en dur. Changer un prix ou un délai dans les données doit se répercuter dans les CGV.
- Mise en forme de lecture : thème clair, largeur de lecture confortable, titres hiérarchisés, sommaire avec ancres pour les CGV, date de dernière mise à jour (valeur dans les données, pas `new Date()` au rendu), styles typographiques cohérents avec le site (globals.css).

## 2. Mentions légales — `/mentions-legales`
- Pour chacun des deux associés (A et B, depuis `site.associes`) : prénom et nom, mention « EI », adresse, SIREN, immatriculation (registre à compléter), e-mail, téléphone.
- Nom commercial « Allée Nette », utilisé par les deux entrepreneurs individuels dans le cadre d'un partenariat, chacun facturant les prestations qu'il réalise.
- `site.mentionTva`.
- Directeur ou directeurs de la publication.
- Hébergeur : `site.hebergeur` (raison sociale, adresse, téléphone ; emplacements si vides).
- Médiateur de la consommation : `site.mediateur` (nom, adresse, site ; emplacements si vides).
- Assurance responsabilité civile professionnelle : `site.assurance` (emplacements si vides).
- Propriété intellectuelle (logo et textes), crédits (contours des communes : IGN Admin Express, Licence Ouverte — reprends ce qui est déjà affiché sous la carte).

## 3. CGV — `/cgv`
Articles (brief 13.2), dans cet ordre, avec sommaire :
objet ; prestations et prix TTC (renvoi à /tarifs, mention TVA) ; confirmation du prix ferme sur photos (délai depuis CONDITIONS) ; suppléments acceptés par écrit avant le rendez-vous (si la voiture est nettement plus sale que sur les photos, le client choisit entre la formule réservée sans supplément et un report ; aucun supplément imposé sur place) ; conditions d'intervention (emplacement privé, accord de copropriété, prise électrique à moins de 20 m, présence du client 5 minutes au début et à la fin, véhicule jamais conduit par nous, météo, restrictions d'eau) ; zones et déplacement (depuis les données de zone) ; réservation, report, annulation (règle `site.annulation`, marquée « à confirmer » tant que `confirmee` est faux) ; réservation toujours à distance (site, téléphone, message) et demande nouvelle faite sur place programmée pour une autre fois, car pour un contrat conclu au domicile du client la loi interdit tout paiement avant sept jours ; paiement (après la prestation ou en ligne après confirmation ; moyens acceptés ; pas d'acompte ; deux entrepreneurs, chacun facture et encaisse ses prestations) ; droit de rétractation de 14 jours (demande expresse d'exécution anticipée, perte du droit une fois la prestation entièrement exécutée, montant proportionnel si la rétractation intervient après le début ; formulaire type de rétractation en annexe, avec l'adresse et l'e-mail à compléter) ; garantie Retouche 24 h et ses limites (depuis GARANTIE dans src/data/offres.ts : un seul retour, zone 1 seulement, exclusions ; pas de « satisfait ou remboursé ») ; responsabilité et assurance (état des lieux photo à l'arrivée, objets de valeur retirés par le client, véhicule jamais conduit par nous) ; réclamations et médiation (la plateforme européenne de règlement en ligne des litiges a fermé en juillet 2025 : ne la mentionne pas) ; données personnelles (renvoi à /confidentialite) ; droit applicable.
- Le texte de la case d'exécution anticipée affiché à la réservation (src/data/reservation.ts) doit être cohérent avec l'article sur la rétractation : réutilise la même source.

## 4. Politique de confidentialité — `/confidentialite`
- Responsables du traitement : les deux entrepreneurs individuels (responsables conjoints), avec leurs coordonnées depuis la config.
- Données collectées : prénom, téléphone, e-mail, adresse d'intervention, véhicule, photos, créneaux, préférences de paiement, source de la visite et code ; ce qui n'est PAS collecté (aucune donnée bancaire : Stripe et PayPal la traitent ; aucun cookie de mesure).
- Finalités et bases légales : exécution du contrat (ou mesures précontractuelles) ; intérêt légitime pour le suivi ; consentement pour la prospection (case facultative) ; obligation légale pour les pièces comptables.
- Destinataires et sous-traitants : les deux associés ; l'hébergeur ; le service d'envoi d'e-mails (Resend) ; Stripe ; PayPal (seulement si le client choisit PayPal ; le SDK PayPal n'est chargé qu'après son clic) ; la mesure d'audience (Umami, sans cookie). Transferts hors de l'Union européenne : emplacement `[À COMPLÉTER : vérifier pour chaque prestataire le pays d'hébergement et le mécanisme d'encadrement des transferts]` plutôt qu'une affirmation non vérifiée.
- Fonctionnement réel du site, à décrire exactement : aucune base de données ; la demande part par e-mail et n'est pas conservée sur le serveur ; seul un compteur de références (un nombre par année, sans donnée personnelle) est stocké ; photos compressées dans le navigateur et métadonnées EXIF (dont la position GPS) retirées avant l'envoi.
- Durées de conservation : 3 ans après le dernier contact ; pièces comptables selon la loi (10 ans) ; photos : utilisées pour établir le prix, publiées seulement avec accord écrit et plaques floutées.
- Droits (accès, rectification, effacement, opposition, limitation, portabilité, directives après le décès), contact pour les exercer, réclamation auprès de la CNIL (www.cnil.fr).
- Cookies et traceurs : aucun cookie déposé par le site, mesure d'audience sans cookie, pas de contenu tiers intégré (carte en SVG), donc aucun bandeau ; PayPal peut déposer ses propres cookies seulement si le client clique sur « Payer avec PayPal » sur la page de paiement — vérifie que c'est bien le comportement de l'étape 7 et décris-le tel qu'il est.

## 5. Mesure d'audience sans cookie (Umami)
- Composant `MesureAudience` monté dans le layout : charge le script Umami seulement si `NEXT_PUBLIC_UMAMI_WEBSITE_ID` est défini ; source `NEXT_PUBLIC_UMAMI_SRC` (par défaut `https://cloud.umami.is/script.js`) ; `data-domains` = domaine de `site.url` (pour ne pas compter les aperçus ni le local) ; chargement après l'interactivité, sans effet sur le LCP ni le JavaScript initial ; aucune donnée personnelle dans les événements.
- Vérifie que tous les événements de la partie 14 sont branchés, une seule fois et au bon moment : `calculateur_utilise` (première interaction avec un calculateur), `reservation_etape_n`, `demande_envoyee`, `clic_whatsapp` et `clic_telephone` (tous les liens WhatsApp et téléphone du site : barre mobile, pied de page, pages de contact, remerciement, paiement, calculateur hors zone…), `paiement_initie`, `paiement_reussi`. Ajoute ceux qui manquent, avec un test unitaire de `suivre()` (aucune erreur si Umami est absent).
- Les paramètres UTM et les codes (GARAGE, VOISIN, parrain) sont transmis dans l'e-mail de demande (étape 6) : vérifie le parcours /garage → /reserver?code=GARAGE → e-mail.
- `.env.example` : ajoute `NEXT_PUBLIC_UMAMI_WEBSITE_ID` et `NEXT_PUBLIC_UMAMI_SRC` (identifiants publics, pas des secrets), avec commentaires.
- `docs/mesure-audience.md` : créer le site sur Umami Cloud (offre gratuite, conditions à revérifier) ou en auto-hébergement, liste des événements et de leur sens, lecture des UTM.

## 6. Intégration
- Liens dans le pied de page (src/config/navigation.ts les déclare déjà), dans le parcours de réservation (cases CGV et confidentialité) et sur la page de paiement.
- Les trois pages sont indexables et dans le sitemap, avec titre et description uniques (`metadonnees()`).
- `docs/a-completer.md` : liste exhaustive et générée à la main de tous les emplacements `[À COMPLÉTER]` et `[À CONFIRMER]` du site (fichier, valeur de configuration à renseigner, où trouver l'information), pour le README de l'étape 10. Ajoute un test Vitest qui échoue si une valeur affichée « à compléter » n'est pas listée dans ce document, si c'est raisonnablement faisable ; sinon un script `npm run a-completer` qui les liste depuis la config.

## 7. Tests
- Vitest : composants d'injection de valeurs (valeur renseignée / emplacement), cohérence des textes repris des données (prix, délais, garantie, rétractation).
- Playwright (`tests/e2e/legal.spec.ts`) : les trois pages répondent, ont un seul h1, les ancres du sommaire des CGV fonctionnent, le formulaire de rétractation est présent, rendu à 375 px sans débordement, axe-core sans violation critique ou sérieuse ; aucun cookie déposé sur l'accueil, /reserver et /paiement (sans clic PayPal) ; avec `NEXT_PUBLIC_UMAMI_WEBSITE_ID` défini au build de test, le script n'est demandé qu'après le chargement (requête interceptée, jamais réellement envoyée).
