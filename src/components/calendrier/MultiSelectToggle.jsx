export default function MultiSelectToggle({ active, onToggle, hint }) {
  return (
    <div className="ms-row">
      <button type="button" className={`msbtn${active ? " active" : ""}`} onClick={onToggle}>
        <span className="msbtn-box" />
        Sélection multiple
      </button>
      {active && <span className="ms-hint">{hint}</span>}
    </div>
  );
}
