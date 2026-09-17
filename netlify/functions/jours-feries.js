import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSql } from "./lib/db/client.js";

const ZONES = new Set([
  "metropole",
  "alsace-moselle",
  "guadeloupe",
  "guyane",
  "martinique",
  "mayotte",
  "reunion",
  "nouvelle-caledonie",
  "polynesie-francaise",
  "saint-barthelemy",
  "saint-martin",
  "wallis-et-futuna",
]);

async function chargerDepuisCache(sql, zone, annee) {
  return sql`
    select to_char(date, 'YYYY-MM-DD') as date, libelle
    from jours_feries_officiels
    where zone = ${zone} and date >= ${`${annee}-01-01`} and date <= ${`${annee}-12-31`}
  `;
}

async function chargerDepuisApi(zone, annee) {
  const res = await fetch(`https://calendrier.api.gouv.fr/jours-feries/${zone}/${annee}.json`);
  if (!res.ok) throw new HttpError(502, "L'API des jours fériés officiels est indisponible.");
  const data = await res.json();
  return Object.entries(data).map(([date, libelle]) => ({ date, libelle }));
}

export default async (request) => {
  return withErrorHandling(async () => {
    requireSession(request);
    if (request.method !== "GET") throw new HttpError(405, "Méthode non supportée.");

    const url = new URL(request.url);
    const zone = url.searchParams.get("zone");
    const annee = Number(url.searchParams.get("annee"));

    if (!zone || !ZONES.has(zone)) throw new HttpError(400, "Zone inconnue.");
    if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
      throw new HttpError(400, "Année invalide.");
    }

    const sql = getSql();
    let rows = await chargerDepuisCache(sql, zone, annee);

    if (rows.length === 0) {
      const depuisApi = await chargerDepuisApi(zone, annee);
      if (depuisApi.length > 0) {
        await Promise.all(
          depuisApi.map((j) =>
            sql`
              insert into jours_feries_officiels (zone, date, libelle)
              values (${zone}, ${j.date}, ${j.libelle})
              on conflict (zone, date) do nothing
            `
          )
        );
      }
      rows = depuisApi;
    }

    const feries = {};
    for (const row of rows) feries[row.date] = row.libelle;
    return json(200, { feries });
  });
};
