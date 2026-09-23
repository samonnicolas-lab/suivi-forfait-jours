import { useState } from "react";
import { api } from "../api/client";

const ETAPES = [
  {
    icone: "🔐",
    titre: "Connexion",
    texte:
      "Vous vous connectez avec l'email et le mot de passe choisis à la création de votre compte. En cas d'oubli, cliquez sur « Mot de passe oublié ? » sur l'écran de connexion : un lien de réinitialisation vous sera envoyé par email.",
  },
  {
    icone: "📄",
    titre: "1. Renseignez votre contrat",
    texte:
      "Avant toute chose, allez dans l'onglet Contrats pour indiquer votre employeur, votre nombre de jours de forfait annuel et votre quota de congés.",
  },
  {
    icone: "📅",
    titre: "2. Déclarez vos jours",
    texte:
      "Dans le Calendrier ou la vue Semaine, cliquez sur une journée pour indiquer matin et après-midi : travaillé, télétravail, congé, maladie, récupération ou repos.",
  },
  {
    icone: "🧮",
    titre: "3. Suivez votre solde",
    texte:
      "Votre solde de jours de repos se calcule automatiquement à partir de vos déclarations et des jours fériés officiels.",
  },
  {
    icone: "📤",
    titre: "4. Exportez",
    texte: "Depuis l'onglet Export, téléchargez un récapitulatif Excel de votre mois en un clic.",
  },
];

export default function OnboardingModal({ onFermer }) {
  const [neplusAfficher, setNeplusAfficher] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function handleFermer() {
    if (!neplusAfficher) {
      onFermer();
      return;
    }
    setEnCours(true);
    try {
      await api.marquerOnboardingVu();
    } catch {
      // Rien de critique si l'enregistrement échoue : la page réapparaîtra
      // simplement à la prochaine connexion.
    } finally {
      onFermer();
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-titre">
      <div className="modal-card">
        <div className="login-logo" aria-hidden="true">👋</div>
        <h1 id="onboarding-titre" style={{ fontSize: 20, margin: "0 0 4px", textAlign: "center" }}>
          Bienvenue sur Suivi Forfait Jours
        </h1>
        <p className="text-muted" style={{ textAlign: "center", margin: "0 0 16px" }}>
          Voici comment démarrer en quelques étapes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ETAPES.map((etape) => (
            <div key={etape.titre} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden="true">{etape.icone}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{etape.titre}</div>
                <div className="text-muted text-small">{etape.texte}</div>
              </div>
            </div>
          ))}
        </div>

        <label className="field-row" style={{ marginTop: 20, fontSize: 13.5 }}>
          <input
            type="checkbox"
            checked={neplusAfficher}
            onChange={(e) => setNeplusAfficher(e.target.checked)}
          />
          Ne plus afficher ce message la prochaine fois que je me connecte
        </label>

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 16 }}
          disabled={enCours}
          onClick={handleFermer}
        >
          C'est compris, commencer
        </button>
      </div>
    </div>
  );
}
