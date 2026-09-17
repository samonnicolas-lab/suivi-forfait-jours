import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useContratActif } from "../hooks/useContratActif";
import { useJoursFeries } from "../hooks/useJoursFeries";
import { useJoursDeclares } from "../hooks/useJoursDeclares";
import JourDrawer from "../components/calendrier/JourDrawer";
import SelectionBar from "../components/calendrier/SelectionBar";
import MultiSelectToggle from "../components/calendrier/MultiSelectToggle";
import StatsBar from "../components/calendrier/StatsBar";
import Legend from "../components/calendrier/Legend";
import VueAnnuelle from "../components/calendrier/VueAnnuelle";
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
  getISOWeek,
  resolveDecl,
  joursPeriodeContrat,
} from "../utils/calendrier";

export default function Calendrier() {
  const { loading, contratActif, erreur: erreurContrat } = useContratActif();
  const [refMonth, setRefMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const [drawerTargets, setDrawerTargets] = useState([]);
  const [vue, setVue] = useState("mois");

  const today = new Date();
  const y = refMonth.getFullYear();
  const m = refMonth.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const weeksNeeded = Math.ceil((startOffset + daysInMonth) / 7);
  const gridEnd = addDays(gridStart, weeksNeeded * 7 - 1);

  const annees = useMemo(() => {
    const set = new Set([y, gridStart.getFullYear(), gridEnd.getFullYear()]);
    return Array.from(set);
  }, [y, gridStart, gridEnd]);

  const zone = contratActif?.zone_jours_feries || "metropole";
  const feries = useJoursFeries(zone, annees);
  const { parJour, garantirPlage, enregistrer } = useJoursDeclares(contratActif?.id);

  const joursAnnee = contratActif ? joursPeriodeContrat(y, contratActif) : [];

  useEffect(() => {
    if (!contratActif) return;
    garantirPlage(dateKey(gridStart), dateKey(gridEnd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratActif?.id, dateKey(gridStart), dateKey(gridEnd)]);

  useEffect(() => {
    if (!contratActif || vue !== "annee" || joursAnnee.length === 0) return;
    garantirPlage(dateKey(joursAnnee[0]), dateKey(joursAnnee[joursAnnee.length - 1]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contratActif?.id, vue, y]);

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
        <h1>Calendrier</h1>
        <p className="empty-state">
          Aucun contrat actif. <Link to="/contrats">Créez un contrat</Link> pour commencer à
          déclarer vos jours.
        </p>
      </div>
    );
  }

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
    let d = new Date(y, m, 1);
    while (d.getMonth() === m) {
      const k = dateKey(d);
      if (!feries[k]) next.add(k);
      d = addDays(d, 1);
    }
    setSelectedSet(next);
  }

  function selectWeekRow(rowStart) {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < 5; i++) {
        const d = addDays(rowStart, i);
        const k = dateKey(d);
        if (!feries[k]) next.add(k);
      }
      return next;
    });
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

  const rows = [];
  for (let row = 0; row < weeksNeeded; row++) {
    const rowStart = addDays(gridStart, row * 7);
    rows.push(rowStart);
  }

  const joursDuMois = [];
  { let d = new Date(y, m, 1); while (d.getMonth() === m) { joursDuMois.push(d); d = addDays(d, 1); } }

  const joursStats = vue === "annee" ? joursAnnee : joursDuMois;

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Calendrier</h1>
      </div>

      <StatsBar days={joursStats} parJour={parJour} feries={feries} />

      {vue === "mois" && (
        <MultiSelectToggle
          active={multiSelectMode}
          onToggle={() => { setMultiSelectMode((v) => !v); setSelectedSet(new Set()); }}
          hint="Cochez plusieurs jours (ou le n° de semaine pour tout cocher en semaine) pour leur appliquer le même statut"
        />
      )}

      <div className="gran-toggle">
        <button type="button" className={vue === "mois" ? "active" : ""} onClick={() => setVue("mois")}>Mois</button>
        <button type="button" className={vue === "annee" ? "active" : ""} onClick={() => setVue("annee")}>Année</button>
      </div>

      <div className="cal-toolbar">
        <div className="cal-period">{vue === "mois" ? `${MONTH_NAMES[m]} ${y}` : y}</div>
        <div className="cal-navbtns">
          {vue === "mois" ? (
            <>
              <button type="button" onClick={() => setRefMonth(new Date(y, m - 1, 1))}>←</button>
              <button type="button" onClick={() => setRefMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Aujourd'hui</button>
              <button type="button" onClick={() => setRefMonth(new Date(y, m + 1, 1))}>→</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setRefMonth(new Date(y - 1, m, 1))}>←</button>
              <button type="button" onClick={() => setRefMonth(new Date(today.getFullYear(), m, 1))}>Aujourd'hui</button>
              <button type="button" onClick={() => setRefMonth(new Date(y + 1, m, 1))}>→</button>
            </>
          )}
        </div>
      </div>

      {vue === "mois" && (
        <a
          className="btn btn-secondary"
          href={api.urlExportMois(contratActif.id, y, m + 1)}
          style={{ alignSelf: "flex-start" }}
        >
          Exporter ce mois (Excel)
        </a>
      )}

      {vue === "annee" ? (
        <VueAnnuelle
          annee={y}
          contratActif={contratActif}
          onSelectMonth={(monthIndex) => { setRefMonth(new Date(y, monthIndex, 1)); setVue("mois"); }}
        />
      ) : (
        <>
          <div className="month-grid">
            <div />
            {DOW_LABELS.map((l) => <div key={l} className="dow">{l}</div>)}

            {rows.map((rowStart) => (
              <FragmentRow
                key={dateKey(rowStart)}
                rowStart={rowStart}
                month={m}
                today={today}
                feries={feries}
                parJour={parJour}
                selectedSet={selectedSet}
                multiSelectMode={multiSelectMode}
                onDayClick={handleDayClick}
                onWeekNumClick={selectWeekRow}
              />
            ))}
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
        </>
      )}
    </div>
  );
}

function FragmentRow({ rowStart, month, today, feries, parJour, selectedSet, multiSelectMode, onDayClick, onWeekNumClick }) {
  const cells = [];
  for (let i = 0; i < 7; i++) cells.push(addDays(rowStart, i));

  return (
    <>
      <div
        className={`wk-num${multiSelectMode ? " selectable" : ""}`}
        title={multiSelectMode ? "Cocher les jours ouvrés de la semaine (hors samedi/dimanche)" : ""}
        onClick={multiSelectMode ? () => onWeekNumClick(rowStart) : undefined}
      >
        {getISOWeek(rowStart)}
      </div>
      {cells.map((d) => {
        const k = dateKey(d);
        const outside = d.getMonth() !== month;
        const isToday = sameDay(d, today);
        const ferieName = feries[k];
        const isSel = selectedSet.has(k);
        const cls = [
          "day",
          isWeekend(d) && "weekend",
          outside && "outside",
          isToday && "today",
          multiSelectMode && isSel && !ferieName && "msel",
        ].filter(Boolean).join(" ");

        return (
          <div key={k} className={cls} onClick={() => onDayClick(d)}>
            <span className="daynum">{d.getDate()}</span>
            {ferieName ? (
              <span className="ferie-tag" style={{ color: "#c0472e", background: "#f8e4de" }}>{ferieName}</span>
            ) : (
              <>
                {multiSelectMode && <span className="check" />}
                <DayHalves decl={resolveDecl(d, parJour, feries)} />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

function DayHalves({ decl }) {
  const matin = TYPES[decl.matin];
  const apresmidi = TYPES[decl.apresmidi];
  const label = decl.matin === decl.apresmidi ? matin.label : `${matin.label} / ${apresmidi.label}`;
  return (
    <>
      <div className="halves">
        <div className="half" style={{ background: matin.color }} />
        <div className="half" style={{ background: apresmidi.color }} />
      </div>
      <span className="day-label" style={{ color: matin.ink }}>{label}</span>
    </>
  );
}
