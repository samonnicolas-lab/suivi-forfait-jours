import { randomBytes } from "node:crypto";
import { google } from "googleapis";
import { json, error, withErrorHandling } from "./lib/http.js";
import { buildAuthUrl, createOAuthClient } from "./lib/auth/googleClient.js";
import {
  getSession,
  readCookie,
  buildSessionCookie,
  buildClearSessionCookie,
  buildOAuthStateCookie,
  buildClearOAuthStateCookie,
  OAUTH_STATE_COOKIE,
} from "./lib/session/cookies.js";

function redirectTo(url, extraHeaders = []) {
  const headers = new Headers();
  headers.set("Location", url);
  for (const h of extraHeaders) headers.append("Set-Cookie", h);
  return new Response(null, { status: 302, headers });
}

async function handleLogin() {
  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(state);
  return redirectTo(authUrl, [buildOAuthStateCookie(state)]);
}

async function handleCallback(request, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(request, OAUTH_STATE_COOKIE);
  const appBase = (process.env.APP_BASE_URL || "").replace(/\/$/, "");

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectTo(`${appBase}/connexion?erreur=oauth_invalide`, [buildClearOAuthStateCookie()]);
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: userinfo } = await oauth2.userinfo.get();

    if (!userinfo.email || !userinfo.id) {
      return redirectTo(`${appBase}/connexion?erreur=echec_connexion`, [buildClearOAuthStateCookie()]);
    }

    // Pas de refresh_token conservé : l'appli n'appelle plus l'API Google après
    // la connexion, l'email + l'identifiant Google suffisent à identifier
    // l'utilisateur dans Supabase.
    const sessionCookie = buildSessionCookie({
      googleId: userinfo.id,
      email: userinfo.email,
    });

    return redirectTo(`${appBase}/`, [sessionCookie, buildClearOAuthStateCookie()]);
  } catch (err) {
    console.error(err);
    return redirectTo(`${appBase}/connexion?erreur=echec_connexion`, [buildClearOAuthStateCookie()]);
  }
}

async function handleMe(request) {
  const session = getSession(request);
  if (!session || !session.email) {
    return json(200, { connecte: false });
  }
  return json(200, { connecte: true, email: session.email });
}

async function handleLogout() {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", buildClearSessionCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "login":
        return handleLogin();
      case "callback":
        return handleCallback(request, url);
      case "me":
        return handleMe(request);
      case "logout":
        return handleLogout();
      default:
        return error(400, "Action inconnue. Utiliser ?action=login|callback|me|logout.");
    }
  });
};
