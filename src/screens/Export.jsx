import { Link } from "react-router-dom";

export default function Export() {
  return (
    <div className="screen">
      <h1>Export</h1>
      <div className="card">
        <p>
          L'export Excel (données du mois + récap par type de jour) se fait depuis l'écran{" "}
          <Link to="/">Calendrier</Link>, via le bouton « Exporter ce mois » en vue mensuelle.
        </p>
        <p className="text-muted text-small">Export PDF (calendrier visuel) à venir.</p>
      </div>
    </div>
  );
}
