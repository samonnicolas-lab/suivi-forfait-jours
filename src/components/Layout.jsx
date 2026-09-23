import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api/client";
import OnboardingModal from "./OnboardingModal";

const TABS = [
  { to: "/", label: "Calendrier", icon: "📅", end: true },
  { to: "/semaine", label: "Semaine", icon: "🗓️" },
  { to: "/contrats", label: "Contrats", icon: "📄" },
  { to: "/export", label: "Export", icon: "📤" },
  { to: "/reglages", label: "Réglages", icon: "⚙️" },
];

export default function Layout() {
  const [afficherOnboarding, setAfficherOnboarding] = useState(false);

  useEffect(() => {
    api
      .lirePreferences()
      .then((data) => setAfficherOnboarding(!data.onboardingVu))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Navigation principale">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      {afficherOnboarding && <OnboardingModal onFermer={() => setAfficherOnboarding(false)} />}
    </div>
  );
}
