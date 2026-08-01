import { NextResponse } from "next/server";

import { FrontDeskError } from "@/lib/front-desk";
import { createClient, getStaff, type Staff } from "@/lib/supabase/server";

/**
 * Which practice this staff member's requests belong to.
 *
 * Unbound staff (doctor_id null) is the single-practice case: fall back to the
 * only doctor there is. With several practices every staff row must be bound,
 * or we would have no way to know whose patients she is looking at.
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
    throw new FrontDeskError(
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
 * practice's data checks membership here as well.
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

  const doctorId = await resolveStaffDoctorId(staff).catch(() => null);
  if (!doctorId) {
    return NextResponse.json(
      { error: "Aucun cabinet n'est associé à ce compte.", code: "NO_DOCTOR" },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json((await fn(doctorId, staff)) ?? { ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof FrontDeskError) {
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

/** Runs a handler and maps FrontDeskError into a clean JSON response. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
