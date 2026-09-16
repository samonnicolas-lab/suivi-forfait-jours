import { TYPES, TYPE_KEYS } from "../../utils/calendrier";

export default function Legend() {
  return (
    <div className="legend">
      {TYPE_KEYS.map((t) => (
        <div key={t} className="item">
          <span className="swatch" style={{ background: TYPES[t].color }} />
          {TYPES[t].label}
        </div>
      ))}
      <div className="item">
        <span className="swatch" style={{ background: "#c0472e" }} />
        Jour férié
      </div>
    </div>
  );
}
