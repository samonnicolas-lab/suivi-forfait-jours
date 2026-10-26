export default function WeekExportBar({ count, exportHref, onCancel }) {
  if (count === 0) return null;
  return (
    <div className="selbar">
      <div className="selbar-inner">
        <span>{count === 1 ? "1 semaine sélectionnée" : `${count} semaines sélectionnées`}</span>
        <div className="selbar-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Annuler</button>
          <a className="btn btn-primary" href={exportHref}>Exporter (Excel)</a>
        </div>
      </div>
    </div>
  );
}
