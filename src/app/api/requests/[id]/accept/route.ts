import { NextResponse } from "next/server";

import { createClient, getStaff } from "@/lib/supabase/server";
import { resolveStaffDoctorId } from "@/lib/api-response";
import {
  createAppointment,
  createPatient,
  FrontDeskError,
} from "@/lib/front-desk";
import type { AcceptRequestInput, AppointmentRequest } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Approve a request: this is the moment a visitor becomes a patient.
 *
 * Sequence matters. The patient and the appointment are created FIRST, and only
 * then is the request marked accepted — so a failure halfway leaves it pending
 * and retryable, rather than marked done with nothing to show for it.
 *
 * The doctor's PC plays no part in this. A new patient gets a real file number
 * the next time his app syncs; until then she shows as "en attente", which is
 * honest and does not stop the appointment being booked.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as AcceptRequestInput;
  if (!body.appointment_datetime) {
    return NextResponse.json(
      { error: "Choisissez une date et une heure." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: request } = await supabase
    .from("appointment_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<AppointmentRequest>();

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }
  if (request.status === "accepte") {
    return NextResponse.json(
      { error: "Cette demande a déjà été acceptée." },
      { status: 409 },
    );
  }

  // The request carries the practice it was made for; fall back to the staff
  // member's own so requests predating that column still work.
  const doctorId =
    (request as { doctor_id?: string | null }).doctor_id ??
    (await resolveStaffDoctorId(staff));

  let patientId = body.patient_id ?? null;

  try {
    // No existing patient chosen → register one from what the visitor
    // submitted. The secretary has already seen the match list and decided
    // this is somebody new.
    if (!patientId) {
      const created = await createPatient(doctorId, {
        last_name: request.last_name,
        first_name: request.first_name,
        phone: request.phone,
        gender: request.gender,
        age: request.age,
      });
      patientId = created.id;
    }

    const appointment = await createAppointment(doctorId, {
      patient_id: patientId,
      appointment_datetime: body.appointment_datetime,
      duration_minutes: body.duration_minutes || 30,
      notes: request.reason || null,
      status: "a_venir",
    });

    const { error } = await supabase
      .from("appointment_requests")
      .update({
        status: "accepte",
        reviewed_by: staff.user_id,
        reviewed_at: new Date().toISOString(),
        scheduled_at: new Date(
          body.appointment_datetime.replace(" ", "T"),
        ).toISOString(),
        duration_minutes: body.duration_minutes || 30,
        staff_notes: body.staff_notes?.slice(0, 500) ?? "",
        desktop_patient_id: patientId,
        desktop_appointment_id: appointment.id,
        desktop_synced_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) {
      // doctor.db already has both records; only the bookkeeping failed. Say so
      // precisely, so nobody creates the appointment a second time.
      return NextResponse.json(
        {
          error:
            "Le rendez-vous a bien été créé, mais la demande n'a pas pu être marquée comme acceptée. Ne la re-validez pas : signalez-le.",
          patient_id: patientId,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      patient_id: patientId,
      appointment_id: appointment.id,
    });
  } catch (err) {
    if (err instanceof FrontDeskError) {
      return NextResponse.json(
        { error: err.message, code: err.code, patient_id: patientId },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 },
    );
  }
}
