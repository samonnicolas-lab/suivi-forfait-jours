import ExcelJS from "exceljs";
import { withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSql } from "./lib/db/client.js";
import { obtenirFeries } from "./lib/feries/index.js";

const TYPE_LABELS = {
  travaille: "Travaillé",
  teletravail: "Télétravail",
  conge: "Congé",
  maladie: "Maladie",
  recup: "Récupération",
  repos: "Jours non-ouvrés",
};

const DOW_LABELS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }

// Même règle par défaut que côté client (src/utils/calendrier.js#resolveDecl) :
// jour férié -> pas de déclaration, jour ouvré non déclaré -> travaillé,
// week-end non déclaré -> jour non-ouvré.
function resolveDecl(d, declMap, feries) {
  const k = dateKey(d);
  if (feries[k]) return null;
  if (declMap[k]) return declMap[k];
  return isWeekend(d) ? { matin: "repos", apresmidi: "repos" } : { matin: "travaille", apresmidi: "travaille" };
}

async function obtenirContrat(sql, contratId, googleId) {
  const rows = await sql`
    select id, employeur, to_char(date_debut, 'YYYY-MM-DD') as date_debut,
      to_char(date_fin, 'YYYY-MM-DD') as date_fin, jours_forfait, teletravail_active,
      quota_conges_ouvres, zone_jours_feries
    from contrats
    where id = ${contratId} and utilisateur_google_id = ${googleId}
  `;
  if (rows.length === 0) throw new HttpError(404, "Contrat introuvable.");
  return rows[0];
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method !== "GET") throw new HttpError(405, "Méthode non supportée.");

    const url = new URL(request.url);
    const contratId = url.searchParams.get("contratId");
    const annee = Number(url.searchParams.get("annee"));
    const mois = Number(url.searchParams.get("mois")); // 1-12

    if (!contratId || !Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
      throw new HttpError(400, "contratId, annee et mois (1-12) sont requis.");
    }

    const sql = getSql();
    const contrat = await obtenirContrat(sql, contratId, session.googleId);

    const premierJour = new Date(annee, mois - 1, 1);
    const dernierJour = new Date(annee, mois, 0);
    const from = dateKey(premierJour);
    const to = dateKey(dernierJour);

    const [joursDeclares, feries] = await Promise.all([
      sql`
        select to_char(date, 'YYYY-MM-DD') as date, type_matin, type_apresmidi
        from jours_declares
        where contrat_id = ${contratId} and date >= ${from} and date <= ${to}
      `,
      obtenirFeries(sql, contrat.zone_jours_feries, annee),
    ]);

    const declMap = {};
    for (const j of joursDeclares) declMap[j.date] = { matin: j.type_matin, apresmidi: j.type_apresmidi };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Suivi Forfait Jours";
    workbook.created = new Date();

    const feuilleJours = workbook.addWorksheet("Jours");
    feuilleJours.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Jour", key: "jour", width: 12 },
      { header: "Matin", key: "matin", width: 16 },
      { header: "Après-midi", key: "apresmidi", width: 16 },
      { header: "Jour férié", key: "ferie", width: 24 },
    ];
    feuilleJours.getRow(1).font = { bold: true };

    const compteurs = { travaille: 0, teletravail: 0, conge: 0, maladie: 0, recup: 0, repos: 0 };
    let feriesCount = 0;

    let d = new Date(premierJour);
    while (d <= dernierJour) {
      const k = dateKey(d);
      const ferieName = feries[k];
      if (ferieName) {
        feriesCount++;
        feuilleJours.addRow({ date: k, jour: DOW_LABELS[d.getDay()], matin: "", apresmidi: "", ferie: ferieName });
      } else {
        const decl = resolveDecl(d, declMap, feries);
        feuilleJours.addRow({
          date: k,
          jour: DOW_LABELS[d.getDay()],
          matin: TYPE_LABELS[decl.matin],
          apresmidi: TYPE_LABELS[decl.apresmidi],
          ferie: "",
        });
        if (decl.matin === decl.apresmidi) compteurs[decl.matin] += 1;
        else { compteurs[decl.matin] += 0.5; compteurs[decl.apresmidi] += 0.5; }
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }

    const feuilleRecap = workbook.addWorksheet("Récap");
    feuilleRecap.columns = [
      { header: "Élément", key: "libelle", width: 30 },
      { header: "Valeur", key: "valeur", width: 24 },
    ];
    feuilleRecap.getRow(1).font = { bold: true };
    feuilleRecap.addRow({ libelle: "Salarié", valeur: session.email });
    feuilleRecap.addRow({ libelle: "Employeur", valeur: contrat.employeur });
    feuilleRecap.addRow({
      libelle: "Contrat",
      valeur: `Depuis le ${contrat.date_debut}${contrat.date_fin ? ` jusqu'au ${contrat.date_fin}` : ""}`,
    });
    feuilleRecap.addRow({ libelle: "Forfait", valeur: `${contrat.jours_forfait} jours/an` });
    feuilleRecap.addRow({ libelle: "Mois exporté", valeur: `${MONTH_NAMES[mois - 1]} ${annee}` });
    feuilleRecap.addRow({});
    feuilleRecap.addRow({ libelle: "Travaillé (dont télétravail)", valeur: compteurs.travaille + compteurs.teletravail });
    feuilleRecap.addRow({ libelle: "dont Télétravail", valeur: compteurs.teletravail });
    feuilleRecap.addRow({ libelle: "Congé", valeur: compteurs.conge });
    feuilleRecap.addRow({ libelle: "Maladie", valeur: compteurs.maladie });
    feuilleRecap.addRow({ libelle: "Récupération", valeur: compteurs.recup });
    feuilleRecap.addRow({ libelle: "Jours non-ouvrés", valeur: compteurs.repos });
    feuilleRecap.addRow({ libelle: "Jours fériés", valeur: feriesCount });

    const buffer = await workbook.xlsx.writeBuffer();
    const nomFichier = `forfait-jours-${contrat.employeur.replace(/[^a-z0-9]+/gi, "-")}-${annee}-${pad(mois)}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
      },
    });
  });
};
