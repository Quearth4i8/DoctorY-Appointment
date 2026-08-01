import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key, so every query is subject to Row Level Security — see
 * supabase/migrations. The browser is never trusted: it can insert a public
 * appointment request, and (once signed in as staff) read and review them.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
