import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Reglages() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/connexion", { replace: true });
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
    </div>
  );
}
