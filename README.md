# Suivi Forfait Jours

Application web installable (PWA) pour déclarer et suivre ses jours travaillés,
télétravail, congés, maladie, récupération et repos, pour un salarié en CDI
temps plein au forfait jours.

Dépôt séparé de [Notes de frais](https://github.com/samonnicolas-lab/Note_de_frais)
(domaine métier différent, cycle de déploiement indépendant). Une page d'accueil
commune reliera les deux outils plus tard ; l'authentification reste indépendante
entre les deux (pas de SSO en V1).

Fonctionnel de bout en bout : authentification, contrats, et calendrier
(vues mensuelle/semaine, sélection multiple, jours fériés officiels, solde
de repos calculé). L'export PDF/Excel et le paramétrage avancé restent à
construire (voir « Prochaines étapes » ci-dessous).

## Stack

- Frontend : React + Vite, PWA (`vite-plugin-pwa`)
- Backend : fonctions serverless Netlify (format v2, ESM)
- Données : Netlify DB — Postgres serverless géré par [Neon](https://neon.tech),
  provisionné directement depuis Netlify (offre gratuite, pas de carte
  bancaire). Tables `contrats`, `jours_declares`, `jours_feries_entreprise`,
  `jours_feries_officiels` — voir `db/migrations/`.
- Authentification : Google OAuth 2.0 (identité uniquement, scope
  `openid email`) — pas de mode de contournement en dev, même flux réel partout
  sur un client OAuth Google Cloud en niveau gratuit
- Jours fériés officiels : [`calendrier.api.gouv.fr/jours-feries`](https://calendrier.api.gouv.fr/jours-feries/),
  résultat mis en cache dans `jours_feries_officiels`

Aucune clé API ni secret n'est exposé côté navigateur : tous les appels à
Google et à la base de données passent par les fonctions dans `netlify/functions/`.

## Configuration requise

1. **Google Cloud** : créer un projet, créer des identifiants OAuth 2.0 (type
   "Application Web"). Ajouter comme URI de redirection autorisée :
   `https://<votre-site>.netlify.app/api/auth-google?action=callback`
   (et `http://localhost:8888/api/auth-google?action=callback` pour le dev
   local). Aucune API Google payante n'est appelée : l'authentification reste
   sur le niveau gratuit.
2. **Netlify DB** : depuis le dashboard du site (Project configuration → Data
   & storage → Database) ou via `netlify db init` en CLI (après `netlify
   link`). Provisionne une base Neon et injecte automatiquement `NETLIFY_DB_URL`
   dans les variables d'environnement des fonctions (nom réel constaté à
   l'usage — la doc Netlify parle parfois de `NETLIFY_DATABASE_URL`, mais
   c'est `NETLIFY_DB_URL` qui est effectivement injectée). Attention : l'éditeur
   SQL intégré au dashboard Netlify ne permet que des requêtes en lecture (ce
   n'est pas un vrai éditeur de schéma). Pour exécuter `db/migrations/0001_init.sql`
   puis `db/migrations/0002_jours_feries_officiels.sql`, utiliser la chaîne de
   connexion « Read and write » (page Database → branche `production` →
   section Connect) avec `psql` ou un client graphique (TablePlus, DBeaver...).
3. Copier `.env.example` en `.env` pour le dev local si besoin (`netlify db
   init` peut suffire à tout injecter automatiquement). Variables à
   connaître :
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `APP_BASE_URL` (URL publique du site)
   - `SESSION_SECRET` (générer avec
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `NETLIFY_DB_URL` (injectée automatiquement par Netlify DB — à ne
     renseigner à la main que pour un test hors Netlify)

## Développement local

```bash
npm install
npm install -g netlify-cli   # une seule fois
netlify dev                  # sert le frontend Vite + les fonctions sur :8888
```

`netlify dev` charge automatiquement les variables du fichier `.env` et
proxy le frontend Vite avec les fonctions serverless sous `/api/*`.

## Build de production

```bash
npm run build
```

Le déploiement (Netlify) utilise `netlify.toml` : build `npm run build`,
dossier publié `dist/`, fonctions dans `netlify/functions/`.

## Icônes PWA

Les icônes (`public/icons/`) sont générées par un script sans dépendance
externe : `node scripts/generate-icons.mjs`.

## Prochaines étapes

- Export PDF (calendrier visuel) et Excel (données + récap mensuel).
- Jours fériés propres à l'entreprise : saisie (table `jours_feries_entreprise`
  déjà en place) + prise en compte dans le solde de repos.
- Écran de réglages complet du contrat (édition, historique/sélecteur
  multi-contrats — le contrat actif est pour l'instant choisi automatiquement).
- Vérifier en conditions réelles (Google Cloud + Netlify DB configurés) : le
  calendrier n'a été testé qu'avec des appels API mockés faute d'identifiants
  dans cet environnement.
