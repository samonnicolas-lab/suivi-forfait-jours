import { Router } from "express";
import { getSql } from "../db.js";
import { ah } from "../asyncHandler.js";

const router = Router();
const TYPES_VALIDES = new Set(["travaille", "teletravail", "conge", "maladie", "recup", "repos"]);

async function verifierProprietaire(sql, contratId, userId) {
  const rows = await sql`
    select id from contrats where id = ${contratId} and utilisateur_id = ${userId}
  `;
  return rows.length > 0;
}

router.get("/", ah(async (req, res) => {
  const { contratId, from, to } = req.query;
  if (!contratId || !from || !to) {
    return res.status(400).json({ error: "contratId, from et to sont requis." });
  }

  const sql = getSql();
  if (!(await verifierProprietaire(sql, contratId, req.session.userId))) {
    return res.status(404).json({ error: "Contrat introuvable." });
  }

  const rows = await sql`
    select to_char(date, 'YYYY-MM-DD') as date, type_matin, type_apresmidi
    from jours_declares
    where contrat_id = ${contratId} and date >= ${from} and date <= ${to}
  `;
  res.json({ jours: rows });
}));

router.post("/", ah(async (req, res) => {
  const body = req.body || {};
  if (!body.contratId || !Array.isArray(body.jours) || body.jours.length === 0) {
    return res.status(400).json({ error: "contratId et jours (tableau non vide) sont requis." });
  }
  for (const j of body.jours) {
    if (!j.date || !TYPES_VALIDES.has(j.matin) || !TYPES_VALIDES.has(j.apresmidi)) {
      return res.status(400).json({ error: "Chaque jour doit avoir date, matin et apresmidi valides." });
    }
  }

  const sql = getSql();
  if (!(await verifierProprietaire(sql, body.contratId, req.session.userId))) {
    return res.status(404).json({ error: "Contrat introuvable." });
  }

  await Promise.all(
    body.jours.map((j) =>
      sql`
        insert into jours_declares (utilisateur_id, contrat_id, date, type_matin, type_apresmidi, updated_at)
        values (${req.session.userId}, ${body.contratId}, ${j.date}, ${j.matin}, ${j.apresmidi}, now())
        on conflict (contrat_id, date) do update set
          type_matin = excluded.type_matin,
          type_apresmidi = excluded.type_apresmidi,
          updated_at = excluded.updated_at
      `
    )
  );

  res.json({ ok: true });
}));

export default router;
