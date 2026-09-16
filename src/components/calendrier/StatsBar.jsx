import { TYPES, TYPE_KEYS, dateKey, resolveDecl } from "../../utils/calendrier";

function fmtNum(n) {
  return (Math.round(n * 2) / 2).toString();
}

// Compte les jours par type sur la période visible (mois ou semaine), plus
// le solde de repos annuel (calculé par le parent, qui a accès aux jours
// fériés de l'année entière).
export default function StatsBar({ days, parJour, feries, soldeRepos, anneeSolde }) {
  const counts = {};
  TYPE_KEYS.forEach((t) => { counts[t] = 0; });
  let feriesCount = 0;

  for (const d of days) {
    if (feries[dateKey(d)]) { feriesCount++; continue; }
    const decl = resolveDecl(d, parJour, feries);
    if (decl.matin === decl.apresmidi) counts[decl.matin] += 1;
    else { counts[decl.matin] += 0.5; counts[decl.apresmidi] += 0.5; }
  }

  return (
    <div className="cal-stats">
      {TYPE_KEYS.map((t) => (
        <div key={t} className="cal-stat">
          <div className="label">{TYPES[t].label}</div>
          <div className="value">{fmtNum(counts[t])} <small>j.</small></div>
        </div>
      ))}
      <div className="cal-stat">
        <div className="label">Fériés</div>
        <div className="value">{feriesCount} <small>j.</small></div>
      </div>
      <div className="cal-stat solde">
        <div className="label">Solde repos {anneeSolde}</div>
        <div className="value">{soldeRepos} <small>j./an</small></div>
      </div>
    </div>
  );
}
