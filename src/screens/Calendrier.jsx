export default function Calendrier() {
  return (
    <div className="screen">
      <h1>Calendrier</h1>
      <div className="card">
        <p>
          Vue mensuelle à venir (prochaine étape) : n° de semaine ISO, jours fériés via{" "}
          <code>calendrier.api.gouv.fr</code>, sélection multiple, tiroir de saisie par
          demi-journée — voir le prototype validé dans le cahier des charges.
        </p>
      </div>
    </div>
  );
}
