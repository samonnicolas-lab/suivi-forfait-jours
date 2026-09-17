import { MONTH_NAMES } from "../../utils/calendrier";

export default function VueAnnuelle({ annee, contratActif, onSelectMonth }) {
  const today = new Date();
  const contratDebut = contratActif ? new Date(contratActif.date_debut) : null;
  const contratFin = contratActif && contratActif.date_fin ? new Date(contratActif.date_fin) : null;

  return (
    <div className="year-grid">
      {MONTH_NAMES.map((nom, m) => {
        const monthStart = new Date(annee, m, 1);
        const monthEnd = new Date(annee, m + 1, 0);
        const isCurrent = today.getFullYear() === annee && today.getMonth() === m;
        const isPast = !isCurrent && monthEnd < today;
        const isOutside =
          (contratDebut && monthEnd < contratDebut) || (contratFin && monthStart > contratFin);

        const cls = ["year-tile", isCurrent && "current", isPast && "past", isOutside && "outside"]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={m}
            className={cls}
            onClick={() => onSelectMonth(m)}
          >
            {nom} {annee}
          </div>
        );
      })}
    </div>
  );
}
