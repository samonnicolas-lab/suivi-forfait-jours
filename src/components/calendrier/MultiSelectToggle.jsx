export default function MultiSelectToggle({ active, onToggle, hint, label = "Sélection multiple" }) {
  return (
    <div className="ms-row">
      <button type="button" className={`msbtn${active ? " active" : ""}`} onClick={onToggle}>
        <span className="msbtn-box" />
        {label}
      </button>
      {active && <span className="ms-hint">{hint}</span>}
    </div>
  );
}
