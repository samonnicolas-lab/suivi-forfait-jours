import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSql } from "./lib/db/client.js";

const TYPES_VALIDES = new Set(["travaille", "teletravail", "conge", "maladie", "recup", "repos"]);

async function verifierProprietaire(sql, contratId, googleId) {
  const rows = await sql`
    select id from contrats where id = ${contratId} and utilisateur_google_id = ${googleId}
  `;
  if (rows.length === 0) throw new HttpError(404, "Contrat introuvable.");
}

async function handleList(request, session) {
  const url = new URL(request.url);
  const contratId = url.searchParams.get("contratId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!contratId || !from || !to) throw new HttpError(400, "contratId, from et to sont requis.");

  const sql = getSql();
  await verifierProprietaire(sql, contratId, session.googleId);

  const rows = await sql`
    select to_char(date, 'YYYY-MM-DD') as date, type_matin, type_apresmidi
    from jours_declares
    where contrat_id = ${contratId} and date >= ${from} and date <= ${to}
  `;
  return json(200, { jours: rows });
}

async function handleUpsert(request, session) {
  const body = await request.json().catch(() => null);
  if (!body || !body.contratId || !Array.isArray(body.jours) || body.jours.length === 0) {
    throw new HttpError(400, "contratId et jours (tableau non vide) sont requis.");
  }
  for (const j of body.jours) {
    if (!j.date || !TYPES_VALIDES.has(j.matin) || !TYPES_VALIDES.has(j.apresmidi)) {
      throw new HttpError(400, "Chaque jour doit avoir date, matin et apresmidi valides.");
    }
  }

  const sql = getSql();
  await verifierProprietaire(sql, body.contratId, session.googleId);

  await Promise.all(
    body.jours.map((j) =>
      sql`
        insert into jours_declares (utilisateur_google_id, contrat_id, date, type_matin, type_apresmidi, updated_at)
        values (${session.googleId}, ${body.contratId}, ${j.date}, ${j.matin}, ${j.apresmidi}, now())
        on conflict (contrat_id, date) do update set
          type_matin = excluded.type_matin,
          type_apresmidi = excluded.type_apresmidi,
          updated_at = excluded.updated_at
      `
    )
  );

  return json(200, { ok: true });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method === "GET") return handleList(request, session);
    if (request.method === "POST") return handleUpsert(request, session);
    throw new HttpError(405, "Méthode non supportée.");
  });
};
