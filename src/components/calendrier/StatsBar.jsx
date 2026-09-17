import { TYPES, TYPE_KEYS, dateKey, resolveDecl } from "../../utils/calendrier";

function fmtNum(n) {
  return (Math.round(n * 2) / 2).toString();
}

// Compte les jours par type sur la période visible (mois, semaine ou année).
// Le calcul d'un solde de congés/repos est volontairement laissé aux RH :
// cet outil sert à déclarer, pas à faire foi sur les compteurs.
export default function StatsBar({ days, parJour, feries }) {
  const counts = {};
  TYPE_KEYS.forEach((t) => { counts[t] = 0; });
  let feriesCount = 0;

  for (const d of days) {
    if (feries[dateKey(d)]) { feriesCount++; continue; }
    const decl = resolveDecl(d, parJour, feries);
    if (decl.matin === decl.apresmidi) counts[decl.matin] += 1;
    else { counts[decl.matin] += 0.5; counts[decl.apresmidi] += 0.5; }
  }

  // Le télétravail reste du travail : la tuile « Travaillé » cumule les deux,
  // la tuile « Télétravail » garde le détail de la part réalisée à distance.
  const valeurAffichee = (t) => (t === "travaille" ? counts.travaille + counts.teletravail : counts[t]);

  return (
    <div className="cal-stats">
      {TYPE_KEYS.map((t) => (
        <div key={t} className="cal-stat">
          <div className="label">{TYPES[t].label}</div>
          <div className="value">{fmtNum(valeurAffichee(t))} <small>j.</small></div>
        </div>
      ))}
      <div className="cal-stat">
        <div className="label">Fériés</div>
        <div className="value">{feriesCount} <small>j.</small></div>
      </div>
    </div>
  );
}
