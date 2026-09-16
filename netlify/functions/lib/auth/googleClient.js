import { google } from "googleapis";

// Contrairement à notes de frais, cette appli n'appelle aucune API Google après
// la connexion : l'identité (email) suffit, tout le reste est stocké dans Supabase.
// Scope volontairement minimal, pas de refresh_token à conserver.
export const OAUTH_SCOPES = ["openid", "email"];

export function getRedirectUri() {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL n'est pas configuré côté serveur.");
  return `${base.replace(/\/$/, "")}/api/auth-google?action=callback`;
}

export function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ne sont pas configurés côté serveur.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function buildAuthUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    scope: OAUTH_SCOPES,
    state,
  });
}
