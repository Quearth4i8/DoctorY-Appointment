import { NextResponse } from "next/server";

import { createClient, getStaff } from "@/lib/supabase/server";
import type { RequestStatus } from "@/types";

export const dynamic = "force-dynamic";

const FIELDS =
  "id, created_at, last_name, first_name, phone, gender, age, reason, " +
  "is_existing_patient, numero_dossier, dossier_verified, " +
  "preferred_at, preferred_period, status, reviewed_at, scheduled_at, " +
  "duration_minutes, staff_notes, desktop_patient_id, desktop_appointment_id";

/** Lists appointment requests for the review inbox. Staff only. */
export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status") as
    | RequestStatus
    | "toutes"
    | null;

  // The anon key + RLS still apply here; getStaff() having succeeded is what
  // makes is_staff() true for these reads.
  const supabase = createClient();
  let query = supabase
    .from("appointment_requests")
    .select(FIELDS)
    .order("created_at", { ascending: false })
    .limit(200);

  // Scoping to the staff member's doctor is enforced by RLS
  // (can_access_request); repeating it here keeps the query honest about what
  // it is asking for rather than relying on the database to silently drop rows.
  if (staff.doctor_id) {
    query = query.or(`doctor_id.eq.${staff.doctor_id},doctor_id.is.null`);
  }

  if (status && status !== "toutes") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger les demandes." },
      { status: 500 },
    );
  }
  return NextResponse.json(data ?? []);
}
