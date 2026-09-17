import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import Spinner from "../components/Spinner";

const ZONES = [
  { value: "metropole", label: "Métropole" },
  { value: "alsace-moselle", label: "Alsace-Moselle" },
  { value: "guadeloupe", label: "Guadeloupe" },
  { value: "guyane", label: "Guyane" },
  { value: "martinique", label: "Martinique" },
  { value: "mayotte", label: "Mayotte" },
  { value: "reunion", label: "Réunion" },
  { value: "nouvelle-caledonie", label: "Nouvelle-Calédonie" },
  { value: "polynesie-francaise", label: "Polynésie française" },
  { value: "saint-barthelemy", label: "Saint-Barthélemy" },
  { value: "saint-martin", label: "Saint-Martin" },
  { value: "wallis-et-futuna", label: "Wallis-et-Futuna" },
];

const FORM_INITIAL = {
  employeur: "",
  dateDebut: "",
  dateFin: "",
  joursForfait: 218,
  teletravailActive: true,
  quotaCongesOuvres: 25,
  zoneJoursFeries: "metropole",
};

function contratVersForm(c) {
  return {
    employeur: c.employeur,
    dateDebut: c.date_debut,
    dateFin: c.date_fin || "",
    joursForfait: c.jours_forfait,
    teletravailActive: c.teletravail_active,
    quotaCongesOuvres: c.quota_conges_ouvres,
    zoneJoursFeries: c.zone_jours_feries,
  };
}

export default function Contrats() {
  const [contrats, setContrats] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [ouvrirFormulaire, setOuvrirFormulaire] = useState(false);
  const [contratEnEdition, setContratEnEdition] = useState(null);
  const [form, setForm] = useState(FORM_INITIAL);
  const [enregistrement, setEnregistrement] = useState(false);

  const charger = useCallback(async () => {
    try {
      const data = await api.listerContrats();
      setContrats(data.contrats);
    } catch (err) {
      setErreur(err.message);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function ouvrirNouveauContrat() {
    setContratEnEdition(null);
    setForm(FORM_INITIAL);
    setOuvrirFormulaire(true);
  }

  function ouvrirEditionContrat(c) {
    setContratEnEdition(c);
    setForm(contratVersForm(c));
    setOuvrirFormulaire(true);
  }

  function fermerFormulaire() {
    setOuvrirFormulaire(false);
    setContratEnEdition(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur(null);
    try {
      if (contratEnEdition) {
        await api.modifierContrat(contratEnEdition.id, form);
      } else {
        await api.creerContrat(form);
      }
      fermerFormulaire();
      await charger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Contrats</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (ouvrirFormulaire ? fermerFormulaire() : ouvrirNouveauContrat())}
        >
          {ouvrirFormulaire ? "Annuler" : "Nouveau contrat"}
        </button>
      </div>

      {erreur && <div className="alert alert-error">{erreur}</div>}

      {ouvrirFormulaire && (
        <form className="card screen" onSubmit={handleSubmit}>
          <h2 style={{ margin: 0, fontSize: 16 }}>
            {contratEnEdition ? `Modifier « ${contratEnEdition.employeur} »` : "Nouveau contrat"}
          </h2>
          <div className="field">
            <label htmlFor="employeur">Employeur</label>
            <input
              id="employeur"
              required
              value={form.employeur}
              onChange={(e) => setForm({ ...form, employeur: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="dateDebut">Date de début</label>
            <input
              id="dateDebut"
              type="date"
              required
              value={form.dateDebut}
              onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="dateFin">Date de fin (si contrat terminé)</label>
            <input
              id="dateFin"
              type="date"
              value={form.dateFin}
              onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="joursForfait">Jours travaillés prévus au forfait</label>
            <input
              id="joursForfait"
              type="number"
              min="1"
              max="365"
              required
              value={form.joursForfait}
              onChange={(e) => setForm({ ...form, joursForfait: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="quotaCongesOuvres">Quota de congés payés (jours ouvrés)</label>
            <input
              id="quotaCongesOuvres"
              type="number"
              min="0"
              max="60"
              required
              value={form.quotaCongesOuvres}
              onChange={(e) => setForm({ ...form, quotaCongesOuvres: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="zoneJoursFeries">Zone (jours fériés officiels)</label>
            <select
              id="zoneJoursFeries"
              value={form.zoneJoursFeries}
              onChange={(e) => setForm({ ...form, zoneJoursFeries: e.target.value })}
            >
              {ZONES.map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
          <label className="field-row">
            <input
              type="checkbox"
              checked={form.teletravailActive}
              onChange={(e) => setForm({ ...form, teletravailActive: e.target.checked })}
            />
            Télétravail déclarable
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={enregistrement}>
            {enregistrement ? "Enregistrement..." : contratEnEdition ? "Enregistrer les modifications" : "Créer le contrat"}
          </button>
        </form>
      )}

      {contrats === null && !erreur && <Spinner label="Chargement des contrats..." />}

      {contrats !== null && contrats.length === 0 && (
        <p className="empty-state">Aucun contrat pour l'instant. Créez votre premier contrat pour commencer à déclarer vos jours.</p>
      )}

      {contrats !== null && contrats.length > 0 && (
        <div className="contrat-list">
          {contrats.map((c) => (
            <div
              key={c.id}
              className="card contrat-item"
              onClick={() => ouvrirEditionContrat(c)}
              style={{ cursor: "pointer" }}
            >
              <span className="employeur">{c.employeur}</span>
              <span className="text-muted text-small">
                Depuis le {new Date(c.date_debut).toLocaleDateString("fr-FR")} · {c.jours_forfait} j./an ·{" "}
                {c.teletravail_active ? "télétravail activé" : "télétravail désactivé"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
