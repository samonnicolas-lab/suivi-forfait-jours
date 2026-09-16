import { useEffect, useState } from "react";
import { TYPES, TYPE_KEYS, WEEKDAY_FULL, MONTH_NAMES, dateKey, resolveDecl } from "../../utils/calendrier";

// Tiroir de saisie, partagé entre édition d'un seul jour (targets.length === 1)
// et application en masse sur une sélection multiple (targets.length > 1).
export default function JourDrawer({ targets, parJour, feries, onApply, onClose }) {
  const open = targets.length > 0;
  const cle = targets.map(dateKey).join(",");
  const [gran, setGran] = useState("journee");

  useEffect(() => {
    if (targets.length === 0) return;
    const cur = resolveDecl(targets[0], parJour, feries);
    setGran(cur && cur.matin !== cur.apresmidi ? "demi" : "journee");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  if (!open) return null;

  const ferieUnique = targets.length === 1 ? feries[dateKey(targets[0])] : null;

  function currentFor(half) {
    const valeurs = targets.map((d) => {
      const decl = resolveDecl(d, parJour, feries);
      return half === "both" ? decl.matin : decl[half];
    });
    const premiere = valeurs[0];
    return valeurs.every((v) => v === premiere) ? premiere : null;
  }

  function appliquer(half, type) {
    const updates = targets.map((d) => {
      const cur = resolveDecl(d, parJour, feries);
      const next =
        half === "both"
          ? { matin: type, apresmidi: type }
          : { matin: half === "matin" ? type : cur.matin, apresmidi: half === "apresmidi" ? type : cur.apresmidi };
      return { date: dateKey(d), matin: next.matin, apresmidi: next.apresmidi };
    });
    onApply(updates);
  }

  function changerGranularite(next) {
    setGran(next);
    if (next === "journee") {
      const updates = targets
        .map((d) => ({ d, cur: resolveDecl(d, parJour, feries) }))
        .filter(({ cur }) => cur.matin !== cur.apresmidi)
        .map(({ d, cur }) => ({ date: dateKey(d), matin: cur.matin, apresmidi: cur.matin }));
      if (updates.length > 0) onApply(updates);
    }
  }

  function chipRow(half) {
    const current = currentFor(half);
    return (
      <div className="chip-row">
        {TYPE_KEYS.map((t) => {
          const active = current === t;
          const type = TYPES[t];
          return (
            <button
              key={t}
              type="button"
              className={`chip${active ? " active" : ""}`}
              style={active ? { color: type.ink, background: type.soft } : undefined}
              onClick={() => appliquer(half, t)}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    );
  }

  const titre =
    targets.length === 1
      ? `${WEEKDAY_FULL[targets[0].getDay()]} ${targets[0].getDate()} ${MONTH_NAMES[targets[0].getMonth()]} ${targets[0].getFullYear()}`
      : `${targets.length} jours sélectionnés`;

  return (
    <div className="drawer">
      <div className="drawer-inner">
        <div className="drawer-head">
          <div className="ddate">{titre}</div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {ferieUnique ? (
          <p className="ferie-note">
            Jour férié — <b>{ferieUnique}</b>. Non déclarable (voir les jours fériés propres à l’entreprise dans le contrat).
          </p>
        ) : (
          <>
            <div className="gran-toggle">
              <button
                type="button"
                className={gran === "journee" ? "active" : ""}
                onClick={() => changerGranularite("journee")}
              >
                Journée entière
              </button>
              <button
                type="button"
                className={gran === "demi" ? "active" : ""}
                onClick={() => changerGranularite("demi")}
              >
                Demi-journée
              </button>
            </div>
            {gran === "journee" ? (
              chipRow("both")
            ) : (
              <>
                <div className="half-block">
                  <div className="htitle">Matin</div>
                  {chipRow("matin")}
                </div>
                <div className="half-block">
                  <div className="htitle">Après-midi</div>
                  {chipRow("apresmidi")}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
