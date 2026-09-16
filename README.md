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
- Données : Supabase (Postgres), tables `contrats`, `jours_declares`,
  `jours_feries_entreprise` (clé `service_role`, RLS activée sans policy — voir
  `supabase/migrations/0001_init.sql`)
- Authentification : Google OAuth 2.0 (identité uniquement, scope
  `openid email`) — pas de mode de contournement en dev, même flux réel partout
  sur un client OAuth Google Cloud en niveau gratuit
- Jours fériés officiels : [`calendrier.api.gouv.fr/jours-feries`](https://calendrier.api.gouv.fr/jours-feries/)
  (à intégrer côté fonction serverless avec mise en cache, prochaine étape)

Aucune clé API ni secret n'est exposé côté navigateur : tous les appels à
Google et à Supabase passent par les fonctions dans `netlify/functions/`.

## Configuration requise

1. **Google Cloud** : créer un projet, créer des identifiants OAuth 2.0 (type
   "Application Web"). Ajouter comme URI de redirection autorisée :
   `https://<votre-site>.netlify.app/api/auth-google?action=callback`
   (et `http://localhost:8888/api/auth-google?action=callback` pour le dev
   local). Aucune API Google payante n'est appelée : l'authentification reste
   sur le niveau gratuit.
2. **Supabase** : créer un projet, exécuter `supabase/migrations/0001_init.sql`
   dans l'éditeur SQL, récupérer l'URL du projet et la clé `service_role`
   (Project settings → API).
3. Copier `.env.example` en `.env` et renseigner les variables. En production,
   renseigner les mêmes variables dans Netlify (Site settings → Environment
   variables) :
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `APP_BASE_URL` (URL publique du site)
   - `SESSION_SECRET` (générer avec
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

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
- Vérifier en conditions réelles (Google Cloud + Supabase configurés) : le
  calendrier n'a été testé qu'avec des appels API mockés faute d'identifiants
  dans cet environnement.
