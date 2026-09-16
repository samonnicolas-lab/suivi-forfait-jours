import { createClient } from "@supabase/supabase-js";

let client = null;

// Clé service_role : bypasse RLS, chaque fonction doit filtrer elle-même par
// utilisateur_google_id (voir supabase/migrations/0001_init.sql).
export function getSupabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ne sont pas configurés côté serveur.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
