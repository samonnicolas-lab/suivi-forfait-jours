import { json, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSupabase } from "./lib/supabase/client.js";

const TYPES_VALIDES = new Set(["travaille", "teletravail", "conge", "maladie", "recup", "repos"]);

async function verifierProprietaire(supabase, contratId, googleId) {
  const { data, error: dbError } = await supabase
    .from("contrats")
    .select("id")
    .eq("id", contratId)
    .eq("utilisateur_google_id", googleId)
    .maybeSingle();
  if (dbError) throw new HttpError(500, "Impossible de vérifier le contrat.");
  if (!data) throw new HttpError(404, "Contrat introuvable.");
}

async function handleList(request, session) {
  const url = new URL(request.url);
  const contratId = url.searchParams.get("contratId");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!contratId || !from || !to) throw new HttpError(400, "contratId, from et to sont requis.");

  const supabase = getSupabase();
  await verifierProprietaire(supabase, contratId, session.googleId);

  const { data, error: dbError } = await supabase
    .from("jours_declares")
    .select("date, type_matin, type_apresmidi")
    .eq("contrat_id", contratId)
    .gte("date", from)
    .lte("date", to);

  if (dbError) throw new HttpError(500, "Impossible de lister les jours déclarés.");
  return json(200, { jours: data });
}

async function handleUpsert(request, session) {
  const body = await request.json().catch(() => null);
  if (!body || !body.contratId || !Array.isArray(body.jours) || body.jours.length === 0) {
    throw new HttpError(400, "contratId et jours (tableau non vide) sont requis.");
  }
  for (const j of body.jours) {
    if (!j.date || !TYPES_VALIDES.has(j.matin) || !TYPES_VALIDES.has(j.apresmidi)) {
      throw new HttpError(400, "Chaque jour doit avoir date, matin et apresmidi valides.");
    }
  }

  const supabase = getSupabase();
  await verifierProprietaire(supabase, body.contratId, session.googleId);

  const lignes = body.jours.map((j) => ({
    utilisateur_google_id: session.googleId,
    contrat_id: body.contratId,
    date: j.date,
    type_matin: j.matin,
    type_apresmidi: j.apresmidi,
    updated_at: new Date().toISOString(),
  }));

  const { error: dbError } = await supabase
    .from("jours_declares")
    .upsert(lignes, { onConflict: "contrat_id,date" });

  if (dbError) throw new HttpError(500, "Impossible d'enregistrer les jours déclarés.");
  return json(200, { ok: true });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method === "GET") return handleList(request, session);
    if (request.method === "POST") return handleUpsert(request, session);
    throw new HttpError(405, "Méthode non supportée.");
  });
};
