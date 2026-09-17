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

function validerCorps(body) {
  if (!body || !body.employeur || !body.dateDebut || !body.joursForfait) {
    throw new HttpError(400, "employeur, dateDebut et joursForfait sont requis.");
  }
}

async function handleCreate(body, session) {
  validerCorps(body);
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

async function handleUpdate(body, session) {
  validerCorps(body);
  const sql = getSql();
  const rows = await sql`
    update contrats set
      employeur = ${body.employeur},
      date_debut = ${body.dateDebut},
      date_fin = ${body.dateFin || null},
      jours_forfait = ${body.joursForfait},
      teletravail_active = ${!!body.teletravailActive},
      quota_conges_ouvres = ${body.quotaCongesOuvres ?? 25},
      zone_jours_feries = ${body.zoneJoursFeries || "metropole"}
    where id = ${body.id} and utilisateur_google_id = ${session.googleId}
    returning id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
  `;
  if (rows.length === 0) throw new HttpError(404, "Contrat introuvable.");
  return json(200, { contrat: rows[0] });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method === "GET") return handleList(session);
    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      return body && body.id ? handleUpdate(body, session) : handleCreate(body, session);
    }
    return error(405, "Méthode non supportée.");
  });
};
