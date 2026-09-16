import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

const MESSAGES = {
  oauth_invalide: "La connexion a échoué (état invalide). Merci de réessayer.",
  echec_connexion: "La connexion à Google a échoué. Merci de réessayer.",
};

export default function Connexion() {
  const [params] = useSearchParams();
  const erreur = params.get("erreur");

  return (
    <div className="screen center-screen">
      <div className="login-card">
        <div className="login-logo" aria-hidden="true">📅</div>
        <h1>Suivi Forfait Jours</h1>
        <p className="text-muted">
          Déclarez vos jours travaillés, télétravail, congés et repos, et suivez votre quota de
          jours de repos calculé automatiquement.
        </p>
        {erreur && <div className="alert alert-error">{MESSAGES[erreur] || "Une erreur est survenue."}</div>}
        <a className="btn btn-primary btn-block" href={api.loginUrl}>
          <span aria-hidden="true">🔐</span> Se connecter avec Google
        </a>
      </div>
    </div>
  );
}
