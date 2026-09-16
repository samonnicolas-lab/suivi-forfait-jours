export default function SelectionBar({ count, onSelectAll, onCancel, onApply }) {
  if (count === 0) return null;
  return (
    <div className="selbar">
      <div className="selbar-inner">
        <span>{count === 1 ? "1 jour sélectionné" : `${count} jours sélectionnés`}</span>
        <div className="selbar-actions">
          <button type="button" className="btn btn-secondary" onClick={onSelectAll}>Tout cocher</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Annuler</button>
          <button type="button" className="btn btn-primary" onClick={onApply}>Appliquer un statut</button>
        </div>
      </div>
    </div>
  );
}
