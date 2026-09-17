import { neon } from "@neondatabase/serverless";

let sql = null;

// Netlify DB (Neon) injecte automatiquement NETLIFY_DATABASE_URL sur le site
// (et en local via `netlify dev`, une fois le site lié). DATABASE_URL sert de
// repli pour une chaîne de connexion Neon configurée à la main.
export function getSql() {
  if (sql) return sql;
  const url =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Aucune base de données configurée (NETLIFY_DATABASE_URL manquant).");
  }
  sql = neon(url);
  return sql;
}
