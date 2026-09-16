-- Schéma initial : contrats (forfait jours), jours fériés propres à l'entreprise,
-- et jours déclarés (travaillé/télétravail/congé/maladie/récupération/repos).
-- Cf. cahier des charges §9 (modèle de données V1).
--
-- Pas de Supabase Auth : l'identité vient du flux Google OAuth maison
-- (netlify/functions/auth-google.js), qui pose un cookie de session contenant
-- l'identifiant Google (`googleId`) de l'utilisateur. Les fonctions serverless
-- utilisent la clé service_role (qui bypasse RLS) et filtrent elles-mêmes par
-- utilisateur_google_id à chaque requête.
--
-- À exécuter une fois dans l'éditeur SQL du dashboard Supabase.

create table if not exists contrats (
  id uuid primary key default gen_random_uuid(),
  utilisateur_google_id text not null,
  employeur text not null,
  date_debut date not null,
  date_fin date,
  jours_forfait integer not null,
  teletravail_active boolean not null default false,
  quota_conges_ouvres integer not null default 25,
  zone_jours_feries text not null default 'metropole',
  created_at timestamptz not null default now()
);

create index if not exists contrats_utilisateur_idx on contrats (utilisateur_google_id);

create table if not exists jours_feries_entreprise (
  id uuid primary key default gen_random_uuid(),
  contrat_id uuid not null references contrats (id) on delete cascade,
  date date not null,
  libelle text not null,
  unique (contrat_id, date)
);

create table if not exists jours_declares (
  id uuid primary key default gen_random_uuid(),
  utilisateur_google_id text not null,
  contrat_id uuid not null references contrats (id) on delete cascade,
  date date not null,
  type_matin text not null check (type_matin in ('travaille','teletravail','conge','maladie','recup','repos')),
  type_apresmidi text not null check (type_apresmidi in ('travaille','teletravail','conge','maladie','recup','repos')),
  updated_at timestamptz not null default now(),
  unique (contrat_id, date)
);

create index if not exists jours_declares_utilisateur_idx on jours_declares (utilisateur_google_id, date);

-- RLS activée sans policy : seule la clé service_role (bypassrls) peut lire/
-- écrire. La clé anon (si jamais utilisée côté client un jour) n'a aucun accès.
alter table contrats enable row level security;
alter table jours_feries_entreprise enable row level security;
alter table jours_declares enable row level security;

-- Sur ce projet, une table créée via l'éditeur SQL n'est pas automatiquement
-- accessible au rôle service_role : accès explicite requis (déjà rencontré
-- sur le projet notes de frais, cf. sa migration 0004).
grant select, insert, update, delete on contrats to service_role;
grant select, insert, update, delete on jours_feries_entreprise to service_role;
grant select, insert, update, delete on jours_declares to service_role;
