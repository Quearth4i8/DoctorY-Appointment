import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";

/**
 * The privileged client: the service-role key bypasses Row Level Security
 * completely, so every table is readable and writable regardless of policy.
 *
 * `server-only` is what keeps it honest — importing this from anything the
 * browser reaches is a build error, not a code review catch.
 *
 * Returns null when no key is configured, which is the normal state: nothing on
 * the critical path needs this. Public submissions go through
 * `submit_appointment_request()` (security definer) with the anon key, and the
 * secretary's pages run as her own session so RLS scopes them to her practice.
 * Callers must handle null rather than assume it is there.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
