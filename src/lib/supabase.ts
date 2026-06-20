import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

/**
 * Server-side Supabase client using the service-role key. This bypasses RLS and
 * must NEVER be imported into client components. A lazy singleton survives
 * hot-reloads in dev.
 */
const globalForSupabase = globalThis as unknown as {
  __clippilotSupabase?: SupabaseClient;
};

export function getSupabase(): SupabaseClient {
  if (!config.supabaseReady) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!globalForSupabase.__clippilotSupabase) {
    globalForSupabase.__clippilotSupabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return globalForSupabase.__clippilotSupabase;
}
