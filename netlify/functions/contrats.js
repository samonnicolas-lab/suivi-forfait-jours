import { json, error, withErrorHandling, HttpError } from "./lib/http.js";
import { requireSession } from "./lib/session/requireSession.js";
import { getSupabase } from "./lib/supabase/client.js";

async function handleList(session) {
  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("contrats")
    .select("*")
    .eq("utilisateur_google_id", session.googleId)
    .order("date_debut", { ascending: false });

  if (dbError) throw new HttpError(500, "Impossible de lister les contrats.");
  return json(200, { contrats: data });
}

async function handleCreate(request, session) {
  const body = await request.json().catch(() => null);
  if (!body || !body.employeur || !body.dateDebut || !body.joursForfait) {
    throw new HttpError(400, "employeur, dateDebut et joursForfait sont requis.");
  }

  const supabase = getSupabase();
  const { data, error: dbError } = await supabase
    .from("contrats")
    .insert({
      utilisateur_google_id: session.googleId,
      employeur: body.employeur,
      date_debut: body.dateDebut,
      date_fin: body.dateFin || null,
      jours_forfait: body.joursForfait,
      teletravail_active: !!body.teletravailActive,
      quota_conges_ouvres: body.quotaCongesOuvres ?? 25,
      zone_jours_feries: body.zoneJoursFeries || "metropole",
    })
    .select()
    .single();

  if (dbError) throw new HttpError(500, "Impossible de créer le contrat.");
  return json(201, { contrat: data });
}

export default async (request) => {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    if (request.method === "GET") return handleList(session);
    if (request.method === "POST") return handleCreate(request, session);
    return error(405, "Méthode non supportée.");
  });
};
