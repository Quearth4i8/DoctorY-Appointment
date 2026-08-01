import { NextResponse } from "next/server";

import { DoctorApiError } from "@/lib/doctor-api";
import { createClient, getStaff, type Staff } from "@/lib/supabase/server";

/**
 * Which practice this staff member's requests belong to.
 *
 * Unbound staff (doctor_id null) is the single-practice case: fall back to the
 * only doctor there is. With several practices every staff row must be bound,
 * or we would have no way to know whose machine to call.
 */
export async function resolveStaffDoctorId(staff: Staff): Promise<string> {
  if (staff.doctor_id) return staff.doctor_id;

  const { data } = await createClient()
    .from("doctors")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const id = (data as { id?: string } | null)?.id;
  if (!id) {
    throw new DoctorApiError(
      503,
      "Aucun cabinet n'est associé à ce compte.",
      "NO_DOCTOR",
    );
  }
  return id;
}

/**
 * Same as `handle`, but first requires the caller to be a signed-in member of
 * the `staff` table, and hands the handler their practice.
 *
 * The middleware only proves *someone* is signed in. Anyone with a Supabase
 * account in this project would clear that bar, so every route that reaches a
 * doctor's database checks membership here as well.
 */
export async function handleStaff<T>(
  fn: (doctorId: string, staff: Staff) => Promise<T>,
): Promise<NextResponse> {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json(
      { error: "Accès non autorisé.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }
  return handle(async () => fn(await resolveStaffDoctorId(staff), staff));
}

/** Runs a proxy handler and maps DoctorApiError into a clean JSON response. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof DoctorApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code, detail: err.detail },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 },
    );
  }
}
