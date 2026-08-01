import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DayHours, Doctor, Tariff } from "@/types";

const FIELDS =
  "id, slug, title, full_name, specialty, bio, photo_url, address, city, " +
  "phone, email, latitude, longitude, hours, tariffs, is_published, " +
  "remote_api_url, remote_seen_at";

/**
 * Reads doctor profiles with the anon key, so Row Level Security decides what
 * is visible: a visitor sees published profiles only, staff also see drafts.
 * There is no privileged path here on purpose.
 */
function normalise(row: Record<string, unknown>): Doctor {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? "Dr"),
    full_name: String(row.full_name ?? ""),
    specialty: String(row.specialty ?? ""),
    bio: String(row.bio ?? ""),
    photo_url: String(row.photo_url ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    hours: Array.isArray(row.hours) ? (row.hours as DayHours[]) : [],
    tariffs: Array.isArray(row.tariffs) ? (row.tariffs as Tariff[]) : [],
    is_published: row.is_published === true,
    remote_api_url: String(row.remote_api_url ?? ""),
    remote_seen_at: row.remote_seen_at ? String(row.remote_seen_at) : null,
  };
}

export async function listPublishedDoctors(): Promise<Doctor[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("doctors")
    .select(FIELDS)
    .eq("is_published", true)
    .order("full_name");
  return (data ?? []).map((r) => normalise(r as unknown as Record<string, unknown>));
}

export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("doctors")
    .select(FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  return data ? normalise(data as unknown as Record<string, unknown>) : null;
}

/**
 * The profile a staff member manages, draft included — for the settings page.
 *
 * Bound staff get their own doctor; unbound staff (the single-practice case)
 * fall back to the only profile there is. RLS enforces the same rule, so an
 * id belonging to someone else's doctor simply returns nothing.
 */
export async function getDoctorForStaff(
  doctorId: string | null,
): Promise<Doctor | null> {
  const supabase = createClient();

  const query = doctorId
    ? supabase.from("doctors").select(FIELDS).eq("id", doctorId)
    : supabase.from("doctors").select(FIELDS).order("created_at").limit(1);

  const { data } = await query.maybeSingle();
  return data ? normalise(data as unknown as Record<string, unknown>) : null;
}
