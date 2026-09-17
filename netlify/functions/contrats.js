import { json, error, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSql } from "./lib/db/client.js";

async function handleList(session) {
  const sql = getSql();
  const rows = await sql`
    select id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
    from contrats
    where utilisateur_google_id = ${session.googleId}
    order by date_debut desc
  `;
  return json(200, { contrats: rows });
}

async function handleCreate(request, session) {
  const body = await request.json().catch(() => null);
  if (!body || !body.employeur || !body.dateDebut || !body.joursForfait) {
    throw new HttpError(400, "employeur, dateDebut et joursForfait sont requis.");
  }

  const sql = getSql();
  const rows = await sql`
    insert into contrats (
      utilisateur_google_id, employeur, date_debut, date_fin, jours_forfait,
      teletravail_active, quota_conges_ouvres, zone_jours_feries
    )
    values (
      ${session.googleId}, ${body.employeur}, ${body.dateDebut}, ${body.dateFin || null},
      ${body.joursForfait}, ${!!body.teletravailActive}, ${body.quotaCongesOuvres ?? 25},
      ${body.zoneJoursFeries || "metropole"}
    )
    returning id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
  `;
  return json(201, { contrat: rows[0] });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method === "GET") return handleList(session);
    if (request.method === "POST") return handleCreate(request, session);
    return error(405, "Méthode non supportée.");
  });
};
