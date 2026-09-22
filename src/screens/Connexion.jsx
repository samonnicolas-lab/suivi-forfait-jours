import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Connexion() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [messageInfo, setMessageInfo] = useState(null);

  async function connecterEtEntrer(email, password) {
    await authApi.login(email, password);
    await refresh();
    navigate("/", { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur(null);
    setMessageInfo(null);
    setEnCours(true);
    try {
      if (mode === "register") {
        await authApi.register(email, password);
        // Le compte est créé avant même la vérification de l'email : la
        // connexion n'exige pas d'email vérifié (voir auth-maison /login).
        await connecterEtEntrer(email, password);
      } else {
        await connecterEtEntrer(email, password);
      }
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  async function handleMotDePasseOublie() {
    if (!email) {
      setErreur("Renseignez votre email ci-dessus avant de demander une réinitialisation.");
      return;
    }
    setErreur(null);
    setMessageInfo(null);
    setEnCours(true);
    try {
      await authApi.demanderReinitialisation(email);
      setMessageInfo("Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.");
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="screen center-screen">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">📅</div>
        <h1>Suivi Forfait Jours</h1>
        <p className="text-muted">
          Déclarez vos jours travaillés, télétravail, congés et repos, et suivez votre quota de
          jours de repos calculé automatiquement.
        </p>

        {erreur && <div className="alert alert-error">{erreur}</div>}
        {messageInfo && <div className="alert">{messageInfo}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={enCours}>
            {mode === "register" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErreur(null);
              setMessageInfo(null);
            }}
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          {mode === "login" && (
            <button type="button" className="btn-link" onClick={handleMotDePasseOublie}>
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
