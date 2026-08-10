import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface LicenseKey {
  key: string;
  label: string;
  max_activations: number;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  activation_count: number;
}

export interface LicenseActivation {
  id: string;
  license_key: string;
  machine_fingerprint: string;
  hostname: string | null;
  activated_at: string;
  last_seen_at: string;
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

export async function listLicenses(): Promise<LicenseKey[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_licenses", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as LicenseKey[];
}

/** Omit `key` to list every activation across every license (dashboard chart). */
export async function listActivations(key?: string): Promise<LicenseActivation[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_list_activations", {
    p_admin_secret: adminSecret(),
    p_key: key ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as LicenseActivation[];
}

export async function createLicense(params: {
  label: string;
  max_activations: number;
  expires_at: string | null;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_create_license", {
    p_admin_secret: adminSecret(),
    p_label: params.label,
    p_max_activations: params.max_activations,
    p_expires_at: params.expires_at,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateLicense(params: {
  key: string;
  max_activations: number;
  expires_at: string | null;
  revoked: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_update_license", {
    p_admin_secret: adminSecret(),
    p_key: params.key,
    p_max_activations: params.max_activations,
    p_expires_at: params.expires_at,
    p_revoked: params.revoked,
  });
  if (error) throw new Error(error.message);
}

export async function deleteLicense(key: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_delete_license", {
    p_admin_secret: adminSecret(),
    p_key: key,
  });
  if (error) throw new Error(error.message);
}

export async function releaseActivation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("admin_release_activation", {
    p_admin_secret: adminSecret(),
    p_activation_id: id,
  });
  if (error) throw new Error(error.message);
}
