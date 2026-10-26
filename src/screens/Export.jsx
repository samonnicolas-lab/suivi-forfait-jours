import { Link } from "react-router-dom";

export default function Export() {
  return (
    <div className="screen">
      <h1>Export</h1>
      <div className="card">
        <p>
          L'export Excel (données + récap par type de jour) se fait depuis l'écran{" "}
          <Link to="/">Calendrier</Link>, en vue mensuelle :
        </p>
        <ul>
          <li>Bouton « Exporter ce mois » pour exporter le mois affiché en entier.</li>
          <li>
            Bascule « Export par semaines » pour cocher une ou plusieurs semaines précises
            (même sur des mois différents) et n'exporter qu'elles.
          </li>
        </ul>
        <p className="text-muted text-small">Export PDF (calendrier visuel) à venir.</p>
      </div>
    </div>
  );
}
