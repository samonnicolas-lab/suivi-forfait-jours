import { Router } from "express";
import { getSql } from "../db.js";
import { ah } from "../asyncHandler.js";

const router = Router();

router.get("/", ah(async (req, res) => {
  const sql = getSql();
  const rows = await sql`
    select id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
    from contrats
    where utilisateur_id = ${req.session.userId}
    order by date_debut desc
  `;
  res.json({ contrats: rows });
}));

function validerCorps(body, res) {
  if (!body || !body.employeur || !body.dateDebut || !body.joursForfait) {
    res.status(400).json({ error: "employeur, dateDebut et joursForfait sont requis." });
    return false;
  }
  return true;
}

router.post("/", ah(async (req, res) => {
  const body = req.body || {};
  if (!validerCorps(body, res)) return;
  const sql = getSql();

  if (body.id) {
    const rows = await sql`
      update contrats set
        employeur = ${body.employeur},
        date_debut = ${body.dateDebut},
        date_fin = ${body.dateFin || null},
        jours_forfait = ${body.joursForfait},
        teletravail_active = ${!!body.teletravailActive},
        quota_conges_ouvres = ${body.quotaCongesOuvres ?? 25},
        zone_jours_feries = ${body.zoneJoursFeries || "metropole"}
      where id = ${body.id} and utilisateur_id = ${req.session.userId}
      returning id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
        to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
        quota_conges_ouvres, zone_jours_feries
    `;
    if (rows.length === 0) return res.status(404).json({ error: "Contrat introuvable." });
    return res.json({ contrat: rows[0] });
  }

  const rows = await sql`
    insert into contrats (
      utilisateur_id, employeur, date_debut, date_fin, jours_forfait,
      teletravail_active, quota_conges_ouvres, zone_jours_feries
    )
    values (
      ${req.session.userId}, ${body.employeur}, ${body.dateDebut}, ${body.dateFin || null},
      ${body.joursForfait}, ${!!body.teletravailActive}, ${body.quotaCongesOuvres ?? 25},
      ${body.zoneJoursFeries || "metropole"}
    )
    returning id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
  `;
  res.status(201).json({ contrat: rows[0] });
}));

export default router;
