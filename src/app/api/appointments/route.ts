import { handleStaff } from "@/lib/api-response";
import {
  createAppointment,
  DoctorApiError,
  listAppointmentsRange,
} from "@/lib/doctor-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  return handleStaff((doctorId) => {
    if (!from || !to) {
      throw new DoctorApiError(400, "Plage de dates manquante.");
    }
    return listAppointmentsRange(doctorId, from, to);
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    patient_id?: number;
    appointment_datetime?: string;
    duration_minutes?: number;
    notes?: string | null;
    status?: string;
  };

  return handleStaff((doctorId) => {
    if (!body.patient_id || !body.appointment_datetime) {
      throw new DoctorApiError(400, "Patient et date/heure obligatoires.");
    }
    return createAppointment(doctorId, {
      patient_id: body.patient_id,
      appointment_datetime: body.appointment_datetime,
      duration_minutes: body.duration_minutes ?? 30,
      notes: body.notes ?? null,
      status: body.status,
    });
  });
}
