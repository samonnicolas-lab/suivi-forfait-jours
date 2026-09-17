import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSql } from "./lib/db/client.js";
import { obtenirFeries, ZONES } from "./lib/feries/index.js";

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

    const feries = await obtenirFeries(getSql(), zone, annee);
    return json(200, { feries });
  });
};
