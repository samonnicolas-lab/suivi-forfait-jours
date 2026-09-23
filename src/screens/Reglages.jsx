import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/client";

export default function Reglages() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoye, setEnvoye] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/connexion", { replace: true });
  }

  async function handleSignaler(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoye(false);
    setEnCours(true);
    try {
      await authApi.signalerProbleme(message);
      setMessage("");
      setEnvoye(true);
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Réglages</h1>
      </div>
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span className="text-muted">{email}</span>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Signaler un problème</h2>
        <p className="text-muted text-small" style={{ margin: 0 }}>
          Un bug, un comportement inattendu, une suggestion ? Décrivez-le ci-dessous.
        </p>

        {erreur && <div className="alert alert-error">{erreur}</div>}
        {envoye && <div className="alert">Merci, votre signalement a bien été envoyé.</div>}

        <form onSubmit={handleSignaler} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="field">
            <label htmlFor="signalement">Description</label>
            <textarea
              id="signalement"
              rows={4}
              maxLength={2000}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={enCours || !message.trim()}>
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
