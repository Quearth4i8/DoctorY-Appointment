import { handleStaff } from "@/lib/api-response";
import {
  deleteAppointment,
  DoctorApiError,
  updateAppointment,
  updateAppointmentStatus,
} from "@/lib/doctor-api";

export const dynamic = "force-dynamic";

function parseId(params: { id: string }): number {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new DoctorApiError(400, "Identifiant invalide.");
  return id;
}

// Full update (reschedule / edit) when datetime is present; otherwise status-only.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as {
    appointment_datetime?: string;
    duration_minutes?: number;
    status?: string;
    notes?: string | null;
  };

  return handleStaff(() => {
    const id = parseId(params);
    if (body.appointment_datetime) {
      return updateAppointment(id, {
        appointment_datetime: body.appointment_datetime,
        duration_minutes: body.duration_minutes ?? 30,
        status: body.status ?? "a_venir",
        notes: body.notes ?? null,
      });
    }
    if (body.status) {
      return updateAppointmentStatus(id, body.status);
    }
    throw new DoctorApiError(400, "Aucune modification fournie.");
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  return handleStaff(() => {
    const id = parseId(params);
    if (!body.status) throw new DoctorApiError(400, "Statut manquant.");
    return updateAppointmentStatus(id, body.status);
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handleStaff(() => deleteAppointment(parseId(params)));
}
