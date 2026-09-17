import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { getSql } from "./lib/db/client.js";

// Fonction temporaire : exécute le schéma initial (db/migrations/) directement
// depuis l'infrastructure Netlify, qui a accès à la base contrairement à un
// environnement de développement sans accès réseau vers *.db.netlify.com.
// Protégée par un jeton partagé (MIGRATION_TOKEN) plutôt que par la session
// applicative, pour ne pas dépendre de l'auth Google déjà configurée ou non.
// À supprimer une fois la migration confirmée.

const STATEMENTS = [
  `create extension if not exists pgcrypto`,

  `create table if not exists contrats (
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
  )`,

  `create index if not exists contrats_utilisateur_idx on contrats (utilisateur_google_id)`,

  `create table if not exists jours_feries_entreprise (
    id uuid primary key default gen_random_uuid(),
    contrat_id uuid not null references contrats (id) on delete cascade,
    date date not null,
    libelle text not null,
    unique (contrat_id, date)
  )`,

  `create table if not exists jours_declares (
    id uuid primary key default gen_random_uuid(),
    utilisateur_google_id text not null,
    contrat_id uuid not null references contrats (id) on delete cascade,
    date date not null,
    type_matin text not null check (type_matin in ('travaille','teletravail','conge','maladie','recup','repos')),
    type_apresmidi text not null check (type_apresmidi in ('travaille','teletravail','conge','maladie','recup','repos')),
    updated_at timestamptz not null default now(),
    unique (contrat_id, date)
  )`,

  `create index if not exists jours_declares_utilisateur_idx on jours_declares (utilisateur_google_id, date)`,

  `create table if not exists jours_feries_officiels (
    zone text not null,
    date date not null,
    libelle text not null,
    primary key (zone, date)
  )`,
];

export default async (request) => {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!process.env.MIGRATION_TOKEN || token !== process.env.MIGRATION_TOKEN) {
      throw new HttpError(403, "Jeton invalide ou MIGRATION_TOKEN non configuré.");
    }

    if (url.searchParams.get("debug") === "1") {
      const cles = Object.keys(process.env)
        .filter((k) => /DATABASE|NEON|NETLIFY_DB|POSTGRES/i.test(k))
        .sort();
      return json(200, { cles });
    }

    const sql = getSql();
    for (const statement of STATEMENTS) {
      await sql(statement);
    }

    const tables = await sql(`
      select table_name from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);

    return json(200, { ok: true, tables: tables.map((t) => t.table_name) });
  });
};
