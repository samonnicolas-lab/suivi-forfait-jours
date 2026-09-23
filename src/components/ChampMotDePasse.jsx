import { useState } from "react";

// Champ mot de passe avec bouton "œil" pour afficher/masquer la saisie.
// Œil barré par défaut (mot de passe masqué), œil plein une fois révélé —
// même comportement que le formulaire de réinitialisation servi par
// auth-maison (src/templates.js côté auth-maison).
export default function ChampMotDePasse({ id, label = "Mot de passe", value, onChange, autoComplete, minLength, required }) {
  const [revele, setRevele] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="champ-mdp">
        <input
          id={id}
          type={revele ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="toggle-mdp"
          aria-label={revele ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          onClick={() => setRevele((r) => !r)}
        >
          {revele ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
