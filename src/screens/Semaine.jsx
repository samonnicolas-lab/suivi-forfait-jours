import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useContratActif } from "../hooks/useContratActif";
import { useJoursFeries } from "../hooks/useJoursFeries";
import { useJoursDeclares } from "../hooks/useJoursDeclares";
import JourDrawer from "../components/calendrier/JourDrawer";
import SelectionBar from "../components/calendrier/SelectionBar";
import MultiSelectToggle from "../components/calendrier/MultiSelectToggle";
import StatsBar from "../components/calendrier/StatsBar";
import Legend from "../components/calendrier/Legend";
import Spinner from "../components/Spinner";
import {
  TYPES,
  DOW_LABELS,
  MONTH_NAMES,
  dateKey,
  parseKey,
  sameDay,
  isWeekend,
  addDays,
  mondayOf,
  getISOWeek,
  resolveDecl,
  computeSoldeRepos,
  joursPeriodeContrat,
} from "../utils/calendrier";

export default function Semaine() {
  const { loading, contratActif, erreur: erreurContrat } = useContratActif();
  const [refWeekAnchor, setRefWeekAnchor] = useState(() => mondayOf(new Date()));
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const [drawerTargets, setDrawerTargets] = useState([]);

  const today = new Date();
  const jours = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(refWeekAnchor, i)), [refWeekAnchor]);
  const weekEnd = jours[6];

  const annees = useMemo(() => {
    const set = new Set([refWeekAnchor.getFullYear(), weekEnd.getFullYear()]);
    return Array.from(set);
  }, [refWeekAnchor, weekEnd]);

  const zone = contratActif?.zone_jours_feries || "metropole";
  const feries = useJoursFeries(zone, annees);
  const { parJour, garantirPlage, enregistrer } = useJoursDeclares(contratActif?.id);

  const joursAnnee = contratActif ? joursPeriodeContrat(refWeekAnchor.getFullYear(), contratActif) : [];

  useEffect(() => {
    if (!contratActif) return;
    garantirPlage(dateKey(refWeekAnchor), dateKey(weekEnd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratActif?.id, dateKey(refWeekAnchor)]);

  // Le solde de repos affiché ici porte sur toute l'année (période couverte
  // par le contrat), pas seulement sur la semaine visible.
  useEffect(() => {
    if (!contratActif || joursAnnee.length === 0) return;
    garantirPlage(dateKey(joursAnnee[0]), dateKey(joursAnnee[joursAnnee.length - 1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratActif?.id, refWeekAnchor.getFullYear()]);

  if (loading) {
    return (
      <div className="screen center-screen">
        <Spinner label="Chargement..." />
      </div>
    );
  }

  if (erreurContrat) {
    return <div className="alert alert-error">{erreurContrat}</div>;
  }

  if (!contratActif) {
    return (
      <div className="screen">
        <h1>Semaine</h1>
        <p className="empty-state">
          Aucun contrat actif. <Link to="/contrats">Créez un contrat</Link> pour commencer à
          déclarer vos jours.
        </p>
      </div>
    );
  }

  const soldeRepos = computeSoldeRepos(joursAnnee, feries, contratActif, parJour);

  function toggleDaySelection(d) {
    const k = dateKey(d);
    if (feries[k]) return;
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  function selectAllVisible() {
    const next = new Set();
    for (const d of jours) {
      const k = dateKey(d);
      if (!feries[k]) next.add(k);
    }
    setSelectedSet(next);
  }

  function handleDayClick(d) {
    if (multiSelectMode) { toggleDaySelection(d); return; }
    setDrawerTargets([d]);
  }

  function handleApply(updates) {
    enregistrer(updates).catch(() => {});
  }

  function closeDrawer() {
    const wasBulk = drawerTargets.length > 1 || multiSelectMode;
    setDrawerTargets([]);
    if (wasBulk) setSelectedSet(new Set());
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Semaine</h1>
      </div>

      <StatsBar days={jours} parJour={parJour} feries={feries} soldeRepos={soldeRepos} anneeSolde={refWeekAnchor.getFullYear()} />

      <MultiSelectToggle
        active={multiSelectMode}
        onToggle={() => { setMultiSelectMode((v) => !v); setSelectedSet(new Set()); }}
        hint="Cochez plusieurs jours pour leur appliquer le même statut"
      />

      <div className="cal-toolbar">
        <div className="cal-period">
          Semaine <span className="weeknum">n°{getISOWeek(refWeekAnchor)}</span> — {refWeekAnchor.getDate()} → {weekEnd.getDate()} {MONTH_NAMES[weekEnd.getMonth()]} {weekEnd.getFullYear()}
        </div>
        <div className="cal-navbtns">
          <button type="button" onClick={() => setRefWeekAnchor(addDays(refWeekAnchor, -7))}>←</button>
          <button type="button" onClick={() => setRefWeekAnchor(mondayOf(new Date()))}>Aujourd'hui</button>
          <button type="button" onClick={() => setRefWeekAnchor(addDays(refWeekAnchor, 7))}>→</button>
        </div>
      </div>

      <div className={`week-list${multiSelectMode ? " ms-active" : ""}`}>
        {jours.map((d, i) => {
          const k = dateKey(d);
          const isToday = sameDay(d, today);
          const ferieName = feries[k];
          const isSel = selectedSet.has(k);
          const cls = [
            "week-row",
            isWeekend(d) && "weekend",
            isToday && "today",
            multiSelectMode && isSel && !ferieName && "msel",
          ].filter(Boolean).join(" ");

          return (
            <div key={k} className={cls} onClick={() => handleDayClick(d)}>
              <span className="wcheck" />
              <div className="wd">
                <span className="name">{DOW_LABELS[i]}</span>
                <span className="num">{d.getDate()}</span>
              </div>
              {ferieName ? (
                <div className="week-ferie" style={{ color: "#c0472e" }}>Jour férié — {ferieName}</div>
              ) : (
                <WeekHalves decl={resolveDecl(d, parJour, feries)} />
              )}
            </div>
          );
        })}
      </div>

      <Legend />

      <SelectionBar
        count={selectedSet.size}
        onSelectAll={selectAllVisible}
        onCancel={() => setSelectedSet(new Set())}
        onApply={() => setDrawerTargets(Array.from(selectedSet).map(parseKey))}
      />

      <JourDrawer
        targets={drawerTargets}
        parJour={parJour}
        feries={feries}
        onApply={handleApply}
        onClose={closeDrawer}
      />
    </div>
  );
}

function WeekHalves({ decl }) {
  const matin = TYPES[decl.matin];
  const apresmidi = TYPES[decl.apresmidi];
  return (
    <div className="halves-row">
      <div className="half" style={{ background: matin.color, color: "#fff" }}>{matin.label}</div>
      <div className="half" style={{ background: apresmidi.color, color: "#fff" }}>{apresmidi.label}</div>
    </div>
  );
}
