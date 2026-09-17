// Types de jours déclarables (cahier des charges §4.2) et helpers de date
// communs à la vue mensuelle et à la vue semaine.

export const TYPES = {
  travaille: { label: "Travaillé", color: "#2c6b5e", soft: "#e2efec", ink: "#1d4b41" },
  teletravail: { label: "Télétravail", color: "#2f6fa0", soft: "#e2ecf3", ink: "#1f4f74" },
  conge: { label: "Congé", color: "#ad7c1d", soft: "#f6edda", ink: "#805c14" },
  maladie: { label: "Maladie", color: "#b24a63", soft: "#f5e2e7", ink: "#87344a" },
  recup: { label: "Récupération", color: "#6b5b95", soft: "#eae6f4", ink: "#4d4070" },
  repos: { label: "Jours non-ouvrés", color: "#7c8990", soft: "#e9edee", ink: "#5b6569" },
};
export const TYPE_KEYS = Object.keys(TYPES);

export const DOW_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const WEEKDAY_FULL = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWeekend(d) {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function mondayOf(d) {
  const w = (d.getDay() + 6) % 7;
  return addDays(d, -w);
}

export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const diff = (d - firstThursday) / 86400000;
  return 1 + Math.round(diff / 7);
}

// Jours de l'année `annee` réellement couverts par le contrat (clampés à sa
// date de début / date de fin s'il démarre ou s'arrête en cours d'année).
export function joursPeriodeContrat(annee, contrat) {
  const debutAnnee = new Date(annee, 0, 1);
  const finAnnee = new Date(annee, 11, 31);
  // `parseKey` construit la date à minuit en heure locale, contrairement à
  // `new Date("YYYY-MM-DD")` qui la lit en UTC : sur ce projet, comparer les
  // deux formes faisait sauter le dernier jour de la période (le 31/12 à
  // 2h locales n'est pas <= au 31/12 à 0h locales).
  const contratDebut = parseKey(contrat.date_debut);
  const contratFin = contrat.date_fin ? parseKey(contrat.date_fin) : null;
  const debut = contratDebut > debutAnnee ? contratDebut : debutAnnee;
  const fin = contratFin && contratFin < finAnnee ? contratFin : finAnnee;

  const jours = [];
  let d = new Date(debut);
  while (d <= fin) {
    jours.push(d);
    d = addDays(d, 1);
  }
  return jours;
}

// Formule §4.1 du cahier des charges, sur la période du contrat pour l'année
// donnée (pas l'année civile complète si le contrat démarre/s'arrête en
// cours d'année), puis nettée des jours non-ouvrés déjà pris sur des jours
// qui auraient sinon été ouvrés : c'est un vrai solde restant, pas juste le
// quota théorique brut. N'inclut pour l'instant que les jours fériés
// officiels (pas encore les jours fériés propres à l'entreprise, dont la
// saisie reste à construire).
//
// Le forfait et le quota de congés sont des droits annuels : sur une période
// plus courte (contrat démarré/arrêté en cours d'année), ils sont proratisés
// à la fraction de l'année couverte — sinon un contrat de 4 mois se voit
// quand même soustraire un forfait de 218 jours pensé pour 12 mois, ce qui
// donne un solde absurdement négatif.
export function computeSoldeRepos(joursPeriode, feries, contrat, declMap) {
  if (joursPeriode.length === 0) return 0;

  const annee = joursPeriode[0].getFullYear();
  const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
  const joursAnneeComplete = bissextile ? 366 : 365;
  const prorata = joursPeriode.length / joursAnneeComplete;

  const forfaitProratise = Math.round(contrat.jours_forfait * prorata * 2) / 2;
  const congesProratises = Math.round(contrat.quota_conges_ouvres * prorata * 2) / 2;

  let weekends = 0;
  let feriesOuvres = 0;
  let nonOuvresConsommes = 0;

  for (const d of joursPeriode) {
    if (isWeekend(d)) { weekends++; continue; }
    const k = dateKey(d);
    if (feries[k]) { feriesOuvres++; continue; }
    const decl = resolveDecl(d, declMap, feries);
    if (decl.matin === "repos") nonOuvresConsommes += 0.5;
    if (decl.apresmidi === "repos") nonOuvresConsommes += 0.5;
  }

  const quota = joursPeriode.length - weekends - feriesOuvres - congesProratises - forfaitProratise;
  return quota - nonOuvresConsommes;
}

// Valeur par défaut d'un jour non encore déclaré explicitement :
// week-end -> repos, jour ouvré -> travaillé. Un jour férié n'a pas de
// déclaration (non déclarable, cf. §4.3).
export function resolveDecl(date, declMap, feries) {
  const k = dateKey(date);
  if (feries[k]) return null;
  if (declMap[k]) return declMap[k];
  return isWeekend(date) ? { matin: "repos", apresmidi: "repos" } : { matin: "travaille", apresmidi: "travaille" };
}
