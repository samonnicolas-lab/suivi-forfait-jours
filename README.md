# Suivi Forfait Jours

Application web installable (PWA) pour déclarer et suivre ses jours travaillés,
télétravail, congés, maladie, récupération et repos, pour un salarié en CDI
temps plein au forfait jours.

Dépôt séparé de [Notes de frais](https://github.com/samonnicolas-lab/Note_de_frais)
(domaine métier différent, cycle de déploiement indépendant).

Fonctionnel de bout en bout : authentification, contrats, et calendrier
(vues mensuelle/semaine, sélection multiple, jours fériés officiels, solde
de repos calculé). L'export PDF/Excel et le paramétrage avancé restent à
construire (voir « Prochaines étapes » ci-dessous).

## Stack

- Frontend : React + Vite, PWA (`vite-plugin-pwa`)
- Backend : serveur Node/Express (`src/server/`), self-hébergé
- Données : Postgres (Docker Compose, sur le même VPS) — tables `contrats`,
  `jours_declares`, `jours_feries_entreprise`, `jours_feries_officiels` ;
  schéma créé automatiquement au démarrage (voir `src/server/db.js`)
- Authentification : [auth-maison](https://github.com/samonnicolas-lab/auth-maison),
  service partagé sous `*.carlezia.fr` (cookie de session sur `.carlezia.fr`,
  SSO avec les autres applis du domaine) — email + mot de passe, plus d'OAuth
  Google. Le frontend appelle directement `auth.carlezia.fr` (`credentials:
  "include"`) ; le backend vérifie la session en interrogeant `/me` sur
  auth-maison à chaque requête protégée (voir `src/server/authMaison.js`).
- Jours fériés officiels : [`calendrier.api.gouv.fr/jours-feries`](https://calendrier.api.gouv.fr/jours-feries/),
  résultat mis en cache dans `jours_feries_officiels`

## Configuration requise

1. **auth-maison** doit déjà tourner sur `auth.carlezia.fr`, avec l'origine de
   cette appli (`https://forfait.carlezia.fr`) dans son `ALLOWED_ORIGINS`.
2. Copier `.env.example` en `.env` et renseigner :
   - `POSTGRES_PASSWORD` / `DATABASE_URL` (même mot de passe des deux côtés)
   - `AUTH_MAISON_URL` / `VITE_AUTH_URL` (par défaut `https://auth.carlezia.fr`,
     à changer seulement pour un environnement de test différent)

## Développement local

```bash
npm install
cp .env.example .env   # adapter DATABASE_URL vers un Postgres local
npm run dev:server     # backend (API) sur :4000
npm run dev            # frontend Vite sur :5173, proxy /api vers :4000
```

## Build de production

```bash
npm run build   # frontend -> dist/
npm start        # sert l'API + dist/ (utilisé par le Dockerfile)
```

## Déploiement sur le VPS (Docker Compose)

Même approche qu'[auth-maison](https://github.com/samonnicolas-lab/auth-maison#déploiement-sur-le-vps-docker-compose) :
Docker Compose pour l'appli + Postgres, Caddy en reverse proxy HTTPS devant.

### 1. Premier déploiement

```bash
git clone git@github.com:samonnicolas-lab/suivi-forfait-jours.git
cd suivi-forfait-jours
cp .env.example .env
nano .env   # POSTGRES_PASSWORD, DATABASE_URL...
docker compose up -d --build
curl http://127.0.0.1:4002/health
# {"ok":true}
```

### 2. Caddy (reverse proxy + HTTPS automatique)

Ajouter au `Caddyfile` du VPS (`/etc/caddy/Caddyfile`) :

```
forfait.carlezia.fr {
    reverse_proxy localhost:4002
}
```

Puis `sudo systemctl reload caddy`. Caddy obtient et renouvelle automatiquement
le certificat Let's Encrypt — pas de certbot à installer.

**Avant cette étape** : le sous-domaine `forfait.carlezia.fr` doit pointer
(enregistrement DNS de type A) vers l'IP de ce serveur.

### 3. Mises à jour

```bash
cd suivi-forfait-jours
git pull
docker compose up -d --build
```

## Icônes PWA

Les icônes (`public/icons/`) sont générées par un script sans dépendance
externe : `node scripts/generate-icons.mjs`.

## Prochaines étapes

- Export PDF (calendrier visuel) et Excel (données + récap mensuel).
- Jours fériés propres à l'entreprise : saisie (table `jours_feries_entreprise`
  déjà en place) + prise en compte dans le solde de repos.
- Écran de réglages complet du contrat (édition, historique/sélecteur
  multi-contrats — le contrat actif est pour l'instant choisi automatiquement).
