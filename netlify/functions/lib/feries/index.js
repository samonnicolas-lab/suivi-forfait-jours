import { HttpError } from "../http.js";

export const ZONES = new Set([
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

// Jours fériés officiels d'une zone/année : cache Postgres d'abord, sinon
// calendrier.api.gouv.fr (résultat alors mis en cache). Retourne un objet
// { "YYYY-MM-DD": "libellé" }.
export async function obtenirFeries(sql, zone, annee) {
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
  return feries;
}
