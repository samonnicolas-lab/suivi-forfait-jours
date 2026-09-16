const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
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

export const api = {
  me: () => request("/auth-google?action=me"),
  logout: () => request("/auth-google?action=logout", { method: "POST" }),
  loginUrl: "/api/auth-google?action=login",

  listerContrats: () => request("/contrats"),

  creerContrat: (payload) =>
    request("/contrats", {
      method: "POST",
      body: JSON.stringify(payload),
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
};
