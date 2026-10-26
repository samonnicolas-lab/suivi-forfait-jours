import { Router } from "express";
import ExcelJS from "exceljs";
import { getSql } from "../db.js";
import { obtenirFeries } from "../feries.js";
import { ah } from "../asyncHandler.js";

const router = Router();

const TYPE_LABELS = {
  travaille: "Travaillé",
  teletravail: "Télétravail",
  conge: "Congé",
  maladie: "Maladie",
  recup: "Récupération",
  repos: "Jours non-ouvrés",
};

const DOW_LABELS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d - firstThursday) / 86400000;
  return 1 + Math.round(diff / 7);
}

// Même règle par défaut que côté client (src/utils/calendrier.js#resolveDecl).
function resolveDecl(d, declMap, feries) {
  const k = dateKey(d);
  if (feries[k]) return null;
  if (declMap[k]) return declMap[k];
  return isWeekend(d) ? { matin: "repos", apresmidi: "repos" } : { matin: "travaille", apresmidi: "travaille" };
}

function parseLundi(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function obtenirContrat(sql, contratId, userId) {
  const rows = await sql`
    select id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
    from contrats
    where id = ${contratId} and utilisateur_id = ${userId}
  `;
  return rows[0] || null;
}

router.get("/", ah(async (req, res) => {
  const { contratId, semaines } = req.query;

  if (!contratId || !semaines) {
    return res.status(400).json({ error: "contratId et semaines sont requis." });
  }

  const lundis = [...new Set(String(semaines).split(","))]
    .map(parseLundi)
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (lundis.length === 0) {
    return res.status(400).json({ error: "Aucune semaine valide dans le paramètre semaines (attendu : lundis au format YYYY-MM-DD, séparés par des virgules)." });
  }

  const sql = getSql();
  const contrat = await obtenirContrat(sql, contratId, req.session.userId);
  if (!contrat) return res.status(404).json({ error: "Contrat introuvable." });

  // Tous les jours des semaines sélectionnées (chaque semaine = lundi..dimanche),
  // dédupliqués et triés — des semaines non contiguës sont possibles.
  const joursSet = new Map();
  for (const lundi of lundis) {
    for (let i = 0; i < 7; i++) {
      const d = addDays(lundi, i);
      joursSet.set(dateKey(d), d);
    }
  }
  const jours = Array.from(joursSet.values()).sort((a, b) => a - b);
  const from = dateKey(jours[0]);
  const to = dateKey(jours[jours.length - 1]);

  const annees = [...new Set(jours.map((d) => d.getFullYear()))];

  const [joursDeclares, feriesParAnnee] = await Promise.all([
    sql`
      select to_char(date, 'YYYY-MM-DD') as date, type_matin, type_apresmidi
      from jours_declares
      where contrat_id = ${contratId} and date >= ${from} and date <= ${to}
    `,
    Promise.all(annees.map((annee) => obtenirFeries(sql, contrat.zone_jours_feries, annee))),
  ]);

  const feries = Object.assign({}, ...feriesParAnnee);
  const declMap = {};
  for (const j of joursDeclares) declMap[j.date] = { matin: j.type_matin, apresmidi: j.type_apresmidi };

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Suivi Forfait Jours";
  workbook.created = new Date();

  const feuilleJours = workbook.addWorksheet("Jours");
  feuilleJours.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Semaine", key: "semaine", width: 10 },
    { header: "Jour", key: "jour", width: 12 },
    { header: "Matin", key: "matin", width: 16 },
    { header: "Après-midi", key: "apresmidi", width: 16 },
    { header: "Jour férié", key: "ferie", width: 24 },
  ];
  feuilleJours.getRow(1).font = { bold: true };

  const compteurs = { travaille: 0, teletravail: 0, conge: 0, maladie: 0, recup: 0, repos: 0 };
  let feriesCount = 0;

  for (const d of jours) {
    const k = dateKey(d);
    const semaineLabel = `S${pad(getISOWeek(d))}`;
    const ferieName = feries[k];
    if (ferieName) {
      feriesCount++;
      feuilleJours.addRow({ date: k, semaine: semaineLabel, jour: DOW_LABELS[d.getDay()], matin: "", apresmidi: "", ferie: ferieName });
    } else {
      const decl = resolveDecl(d, declMap, feries);
      feuilleJours.addRow({
        date: k,
        semaine: semaineLabel,
        jour: DOW_LABELS[d.getDay()],
        matin: TYPE_LABELS[decl.matin],
        apresmidi: TYPE_LABELS[decl.apresmidi],
        ferie: "",
      });
      if (decl.matin === decl.apresmidi) compteurs[decl.matin] += 1;
      else { compteurs[decl.matin] += 0.5; compteurs[decl.apresmidi] += 0.5; }
    }
  }

  const semainesLabels = lundis.map((l) => `S${pad(getISOWeek(l))} ${l.getFullYear()}`);

  const feuilleRecap = workbook.addWorksheet("Récap");
  feuilleRecap.columns = [
    { header: "Élément", key: "libelle", width: 30 },
    { header: "Valeur", key: "valeur", width: 34 },
  ];
  feuilleRecap.getRow(1).font = { bold: true };
  feuilleRecap.addRow({ libelle: "Salarié", valeur: req.session.email });
  feuilleRecap.addRow({ libelle: "Employeur", valeur: contrat.employeur });
  feuilleRecap.addRow({
    libelle: "Contrat",
    valeur: `Depuis le ${contrat.date_debut}${contrat.date_fin ? ` jusqu'au ${contrat.date_fin}` : ""}`,
  });
  feuilleRecap.addRow({ libelle: "Forfait", valeur: `${contrat.jours_forfait} jours/an` });
  feuilleRecap.addRow({ libelle: "Semaines exportées", valeur: semainesLabels.join(", ") });
  feuilleRecap.addRow({});
  feuilleRecap.addRow({ libelle: "Travaillé (dont télétravail)", valeur: compteurs.travaille + compteurs.teletravail });
  feuilleRecap.addRow({ libelle: "dont Télétravail", valeur: compteurs.teletravail });
  feuilleRecap.addRow({ libelle: "Congé", valeur: compteurs.conge });
  feuilleRecap.addRow({ libelle: "Maladie", valeur: compteurs.maladie });
  feuilleRecap.addRow({ libelle: "Récupération", valeur: compteurs.recup });
  feuilleRecap.addRow({ libelle: "Jours non-ouvrés", valeur: compteurs.repos });
  feuilleRecap.addRow({ libelle: "Jours fériés", valeur: feriesCount });

  const buffer = await workbook.xlsx.writeBuffer();
  const suffixeSemaines = lundis.map((l) => `S${pad(getISOWeek(l))}`).join("-");
  const nomFichier = `forfait-jours-${contrat.employeur.replace(/[^a-z0-9]+/gi, "-")}-${suffixeSemaines}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${nomFichier}"`);
  res.send(Buffer.from(buffer));
}));

export default router;
