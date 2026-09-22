import { Router } from "express";
import { getSql } from "../db.js";
import { obtenirFeries, ZONES } from "../feries.js";
import { ah } from "../asyncHandler.js";

const router = Router();

router.get("/", ah(async (req, res) => {
  const zone = req.query.zone;
  const annee = Number(req.query.annee);

  if (!zone || !ZONES.has(zone)) return res.status(400).json({ error: "Zone inconnue." });
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
    return res.status(400).json({ error: "Année invalide." });
  }

  const feries = await obtenirFeries(getSql(), zone, annee);
  res.json({ feries });
}));

export default router;
