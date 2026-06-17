import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/*
  SERVER-ONLY admin client using the Supabase service-role key. It BYPASSES RLS,
  so use it ONLY in trusted server contexts that have no user session — e.g. the
  MGMT webhook, which arrives unauthenticated and must look up which artist owns
  a song and read their device subscriptions. NEVER import this into client code
  or any path reachable by a normal user request.
*/
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service-role credentials are not configured.");
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
