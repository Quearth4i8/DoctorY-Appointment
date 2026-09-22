import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The back-office work queue: listing requests, error reports, site feedback.
 *
 * Every call goes through a SECURITY DEFINER RPC gated by the shared admin
 * secret, exactly like accounts.ts and licenses.ts — the website has no
 * service-role key, and the admin holds its own cookie rather than a Supabase
 * session, so RLS would otherwise hide all of this from it.
 */

function adminSecret(): string {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) throw new Error("ADMIN_API_SECRET n'est pas configuré.");
  return secret;
}

export type ClaimIntent = "inscription" | "revendication";
export type ClaimStatus = "nouveau" | "en_cours" | "accepte" | "refuse";

export interface AdminClaim {
  id: string;
  intent: ClaimIntent;
  status: ClaimStatus;
  kind: string | null;
  establishment: string;
  city: string;
  contact_name: string;
  phone: string;
  email: string;
  professional_id: string;
  message: string;
  resolution: string;
  created_at: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_slug: string | null;
}

export interface AdminReport {
  id: string;
  reason: string;
  detail: string;
  contact: string;
  status: "nouveau" | "traite" | "rejete";
  created_at: string;
  provider_id: string | null;
  provider_name: string | null;
  provider_slug: string | null;
}

export interface AdminFeedback {
  id: string;
  rating: number | null;
  category: string;
  message: string;
  contact: string;
  page_path: string;
  status: "nouveau" | "lu" | "traite" | "rejete";
  created_at: string;
}

export interface IntakeCounts {
  claims: number;
  reports: number;
  feedback: number;
}

/** `null` means every status — the RPC treats it as "no filter". */
export async function listClaims(status: string | null): Promise<AdminClaim[]> {
  const { data, error } = await createClient().rpc("admin_list_claims", {
    p_admin_secret: adminSecret(),
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminClaim[];
}

export async function approveClaim(
  id: string,
): Promise<{ provider_id: string | null; provider_slug: string | null; created: boolean }> {
  const { data, error } = await createClient().rpc("admin_approve_claim", {
    p_admin_secret: adminSecret(),
    p_claim: id,
  });
  if (error) throw new Error(error.message);
  // The RPC returns a one-row table.
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? { provider_id: null, provider_slug: null, created: false }) as {
    provider_id: string | null;
    provider_slug: string | null;
    created: boolean;
  };
}

export async function resolveClaim(
  id: string,
  status: ClaimStatus,
  resolution = "",
): Promise<void> {
  const { error } = await createClient().rpc("admin_resolve_claim", {
    p_admin_secret: adminSecret(),
    p_claim: id,
    p_status: status,
    p_resolution: resolution,
  });
  if (error) throw new Error(error.message);
}

export async function listReports(status: string | null): Promise<AdminReport[]> {
  const { data, error } = await createClient().rpc("admin_list_reports", {
    p_admin_secret: adminSecret(),
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminReport[];
}

export async function resolveReport(id: string, status: string): Promise<void> {
  const { error } = await createClient().rpc("admin_resolve_report", {
    p_admin_secret: adminSecret(),
    p_report: id,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export async function listFeedback(status: string | null): Promise<AdminFeedback[]> {
  const { data, error } = await createClient().rpc("admin_list_feedback", {
    p_admin_secret: adminSecret(),
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminFeedback[];
}

export async function resolveFeedback(id: string, status: string): Promise<void> {
  const { error } = await createClient().rpc("admin_resolve_feedback", {
    p_admin_secret: adminSecret(),
    p_feedback: id,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

export async function intakeCounts(): Promise<IntakeCounts> {
  const { data, error } = await createClient().rpc("admin_intake_counts", {
    p_admin_secret: adminSecret(),
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    claims: Number(row?.claims ?? 0),
    reports: Number(row?.reports ?? 0),
    feedback: Number(row?.feedback ?? 0),
  };
}

// ─── Establishments ──────────────────────────────────────────────────────────

export interface AdminProviderRow {
  id: string;
  kind: string;
  slug: string;
  name: string;
  city: string;
  phone: string;
  is_published: boolean;
  hours_count: number;
  services_count: number;
  duty_count: number;
  created_at: string;
}

/** The editor's shape: the row plus the children it edits wholesale. */
export interface AdminProvider extends Record<string, unknown> {
  id: string;
  kind: string;
  slug: string;
  name: string;
  booking_mode: string;
  hours: { weekday: number; opens_at: string; closes_at: string }[];
  duty: { id?: string; starts_at: string; ends_at: string; kind: string }[];
}

export async function listProviders(
  search: string,
  draftsOnly: boolean,
): Promise<AdminProviderRow[]> {
  const { data, error } = await createClient().rpc("admin_list_providers", {
    p_admin_secret: adminSecret(),
    p_search: search || null,
    p_drafts_only: draftsOnly,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminProviderRow[];
}

export async function getProvider(id: string): Promise<AdminProvider> {
  const { data, error } = await createClient().rpc("admin_get_provider", {
    p_admin_secret: adminSecret(),
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return data as AdminProvider;
}

export async function saveProvider(
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await createClient().rpc("admin_save_provider", {
    p_admin_secret: adminSecret(),
    p_id: id,
    p_data: payload,
  });
  if (error) throw new Error(error.message);
}

/**
 * Turns the RPC's raised exceptions into something an operator can act on.
 * `NO_ADDRESS` and `NO_HOURS` are refusals by design, not faults.
 */
export async function publishProvider(
  id: string,
  published: boolean,
): Promise<void> {
  const { error } = await createClient().rpc("admin_publish_provider", {
    p_admin_secret: adminSecret(),
    p_id: id,
    p_published: published,
  });
  if (!error) return;

  const raised = `${error.message} ${error.details ?? ""}`;
  if (raised.includes("NO_ADDRESS")) {
    throw new Error("Ajoutez l'adresse avant de publier.");
  }
  if (raised.includes("NO_HOURS")) {
    throw new Error(
      "Ajoutez les horaires avant de publier — ou cochez « ouvert 24 h/24 ».",
    );
  }
  throw new Error(error.message);
}
