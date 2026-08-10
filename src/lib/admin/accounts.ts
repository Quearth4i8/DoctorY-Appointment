import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminDoctor {
  id: string;
  slug: string;
  full_name: string;
  title: string;
  specialty: string;
  city: string;
  phone: string;
  email: string;
  is_published: boolean;
  paired: boolean;
  remote_seen_at: string | null;
  staff_count: number;
  created_at: string;
}

export interface AdminStaff {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  doctor_id: string | null;
  doctor_name: string | null;
  created_at: string;
}

export interface AdminAppStats {
  doctors_total: number;
  doctors_published: number;
  staff_total: number;
  staff_secretaries: number;
  requests_total: number;
  requests_pending: number;
  requests_accepted: number;
  requests_refused: number;
  appointments_total: number;
  appointments_upcoming: number;
  patients_total: number;
  patients_active: number;
  license_keys_total: number;
  license_machines_total: number;
}

export interface AdminRequestsByDay {
  day: string;
  count: number;
}

/**
 * The website has no service-role key (see .env's own warning against putting
 * one in Vercel), so every call here goes through a SECURITY DEFINER RPC
 * gated by this shared secret rather than bypassing RLS directly.
 */
function adminSecret(): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET n'est pas configuré.");
  return secret;
}

export async function listDoctors(): Promise<AdminDoctor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_doctors", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminDoctor[];
}

export async function listStaff(): Promise<AdminStaff[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_staff", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminStaff[];
}

export async function reassignStaff(userId: string, doctorId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_reassign_staff", {
    p_admin_secret: adminSecret(),
    p_user_id: userId,
    p_doctor_id: doctorId,
  });
  if (error) throw new Error(error.message);
}

export async function revokeStaff(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_revoke_staff", {
    p_admin_secret: adminSecret(),
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export async function appStats(): Promise<AdminAppStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_app_stats", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) throw new Error("Aucune statistique disponible.");
  return row as AdminAppStats;
}

export async function requestsOverTime(): Promise<AdminRequestsByDay[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_requests_over_time", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminRequestsByDay[];
}
