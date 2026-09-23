const BASE = "/api";
const AUTH_URL = (import.meta.env.VITE_AUTH_URL || "https://auth.carlezia.fr").replace(/\/$/, "");

async function faireRequete(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.error) || `Erreur inattendue (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const request = (path, options) => faireRequete(BASE, path, options);
const authRequest = (path, options) => faireRequete(AUTH_URL, path, options);

// Authentification : appels directs au service partagé auth-maison
// (cookie de session posé sur .carlezia.fr, credentials: "include" requis).
export const authApi = {
  me: () => authRequest("/me"),
  login: (email, password) =>
    authRequest("/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email, password) =>
    authRequest("/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => authRequest("/logout", { method: "POST" }),
  demanderReinitialisation: (email) =>
    authRequest("/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
};

export const api = {
  listerContrats: () => request("/contrats"),

  creerContrat: (payload) =>
    request("/contrats", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  modifierContrat: (id, payload) =>
    request("/contrats", {
      method: "POST",
      body: JSON.stringify({ id, ...payload }),
    }),

  joursFeries: (zone, annee) =>
    request(`/jours-feries?zone=${encodeURIComponent(zone)}&annee=${annee}`),

  listerJoursDeclares: (contratId, from, to) =>
    request(`/jours-declares?contratId=${encodeURIComponent(contratId)}&from=${from}&to=${to}`),

  enregistrerJoursDeclares: (contratId, jours) =>
    request("/jours-declares", {
      method: "POST",
      body: JSON.stringify({ contratId, jours }),
    }),

  urlExportMois: (contratId, annee, mois) =>
    `${BASE}/exporter-mois?contratId=${encodeURIComponent(contratId)}&annee=${annee}&mois=${mois}`,

  lirePreferences: () => request("/preferences"),
  marquerOnboardingVu: () =>
    request("/preferences", { method: "POST", body: JSON.stringify({ onboardingVu: true }) }),
};
