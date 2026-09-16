import { HttpError } from "../http.js";
import { getSession } from "./cookies.js";

// Utilisé par toutes les fonctions qui lisent/écrivent des données propres à
// l'utilisateur (contrats, jours déclarés, ...).
export function requireSession(request) {
  const session = getSession(request);
  if (!session || !session.googleId) {
    throw new HttpError(401, "Non connecté.");
  }
  return session;
}
