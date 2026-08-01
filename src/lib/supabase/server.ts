import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Still uses the anon key, so Row Level Security applies exactly as it does in
 * the browser — this is the session-aware client, not a privileged one. For the
 * privileged path see ./admin.ts.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * The signed-in user, or null. Uses getUser() (which revalidates the JWT with
 * Supabase) rather than getSession(), whose cookie payload is client-writable.
 */
export async function getUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export type Staff = {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  /**
   * The doctor this person works for. Null means "not bound to one", which the
   * RLS policies read as whole-practice access — the single-doctor case.
   */
  doctor_id: string | null;
};

/**
 * The signed-in user's staff row (role, name, email), or null if they are not
 * on the allowlist. Every protected page gates on this.
 */
export async function getStaff(): Promise<Staff | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("staff")
    .select("user_id, role, full_name, doctor_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    ...data,
    doctor_id: (data as { doctor_id?: string | null }).doctor_id ?? null,
    email: userData.user.email ?? "",
  };
}
