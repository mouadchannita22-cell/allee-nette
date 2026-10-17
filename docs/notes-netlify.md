# Notes Netlify (contexte officiel lu via le connecteur, 16/10/2026)

- Next.js : runtime OpenNext (@netlify/plugin-nextjs) installé automatiquement ; ne pas l'épingler. Route handlers → fonctions ; proxy/middleware → edge function. netlify.toml : command "next build" (ou npm run build), publish ".next".
- Variables d'environnement : injectées au build ; toute modification exige un redéploiement. Pour l'accès à l'exécution (fonctions), la portée doit inclure Functions ET Builds. Les variables écrites dans netlify.toml ne sont PAS disponibles pour les fonctions. Ne jamais préfixer un secret par NEXT_PUBLIC_.
- Variables de build (CONTEXT…) : pour les utiliser à l'exécution, les recopier au build (ex. next.config `env`, ou `command = "X=$CONTEXT npm run build"`). Ne pas compter sur process.env.CONTEXT dans une fonction.
- Limites fonctions : 60 s ; requête/réponse en mémoire 6 Mo, binaire encodé en base64 → **4,5 Mo de binaire effectif**. Total des variables d'environnement ~4 Ko pour toutes les fonctions.
- En-têtes : [[headers]] de netlify.toml / _headers ne s'appliquent qu'aux réponses statiques du CDN ; les en-têtes des fonctions se posent dans le code.
- Blobs : getStore = magasin partagé entre TOUS les contextes (aperçus compris) → nom de magasin propre au contexte (ex. `references` en production, `references-apercu` sinon). Cohérence par défaut « eventual » ; utiliser `consistency: "strong"`. set/setJSON acceptent { onlyIfNew, onlyIfMatch } et renvoient { modified, etag }. Netlify déconseille les compteurs sur Blobs (règle maison) : volume très faible ici, CAS + tentatives acceptables, à documenter.
- Indexation : seules la production publiée et les derniers branch deploys sont indexables ; les aperçus reçoivent X-Robots-Tag: noindex.
- Ajouter `.netlify` à .gitignore (déjà fait).
- Déploiement recommandé : Git CD (import du dépôt GitHub dans l'interface Netlify). La CLI ne peut pas joindre l'API depuis le conteneur.
