import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Tag `sql` compatible avec l'API du driver Neon utilisée auparavant
// (`neon(url)`), pour garder les requêtes des routes quasiment inchangées :
// `sql\`select ... where id = ${id}\`` renvoie directement les lignes.
export function sql(strings, ...values) {
  let text = "";
  strings.forEach((part, i) => {
    text += part;
    if (i < values.length) text += `$${i + 1}`;
  });
  return pool.query(text, values).then((res) => res.rows);
}

export function getSql() {
  return sql;
}

// Schéma créé au démarrage (instructions idempotentes), comme auth-maison :
// self-hébergé sur un serveur qu'on contrôle entièrement, pas besoin d'étape
// manuelle séparée (contrairement à l'éditeur SQL Netlify DB en lecture seule
// qu'il fallait contourner avant).
export async function migrer() {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists contrats (
      id uuid primary key default gen_random_uuid(),
      utilisateur_id uuid not null,
      employeur text not null,
      date_debut date not null,
      date_fin date,
      jours_forfait integer not null,
      teletravail_active boolean not null default false,
      quota_conges_ouvres integer not null default 25,
      zone_jours_feries text not null default 'metropole',
      created_at timestamptz not null default now()
    );
    create index if not exists contrats_utilisateur_idx on contrats (utilisateur_id);

    create table if not exists jours_feries_entreprise (
      id uuid primary key default gen_random_uuid(),
      contrat_id uuid not null references contrats (id) on delete cascade,
      date date not null,
      libelle text not null,
      unique (contrat_id, date)
    );

    create table if not exists jours_declares (
      id uuid primary key default gen_random_uuid(),
      utilisateur_id uuid not null,
      contrat_id uuid not null references contrats (id) on delete cascade,
      date date not null,
      type_matin text not null check (type_matin in ('travaille','teletravail','conge','maladie','recup','repos')),
      type_apresmidi text not null check (type_apresmidi in ('travaille','teletravail','conge','maladie','recup','repos')),
      updated_at timestamptz not null default now(),
      unique (contrat_id, date)
    );
    create index if not exists jours_declares_utilisateur_idx on jours_declares (utilisateur_id, date);

    create table if not exists jours_feries_officiels (
      zone text not null,
      date date not null,
      libelle text not null,
      primary key (zone, date)
    );
  `);
}
