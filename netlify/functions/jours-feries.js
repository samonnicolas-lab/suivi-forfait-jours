import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSupabase } from "./lib/supabase/client.js";

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

async function chargerDepuisCache(supabase, zone, annee) {
  const { data, error: dbError } = await supabase
    .from("jours_feries_officiels")
    .select("date, libelle")
    .eq("zone", zone)
    .gte("date", `${annee}-01-01`)
    .lte("date", `${annee}-12-31`);
  if (dbError) throw new HttpError(500, "Impossible de lire le cache des jours fériés.");
  return data;
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

    const supabase = getSupabase();
    let rows = await chargerDepuisCache(supabase, zone, annee);

    if (rows.length === 0) {
      const depuisApi = await chargerDepuisApi(zone, annee);
      if (depuisApi.length > 0) {
        const { error: dbError } = await supabase
          .from("jours_feries_officiels")
          .upsert(
            depuisApi.map((j) => ({ zone, date: j.date, libelle: j.libelle })),
            { onConflict: "zone,date" }
          );
        if (dbError) console.error("Échec de la mise en cache des jours fériés :", dbError);
      }
      rows = depuisApi;
    }

    const feries = {};
    for (const row of rows) feries[row.date] = row.libelle;
    return json(200, { feries });
  });
};
