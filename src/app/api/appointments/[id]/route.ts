import { handleStaff } from "@/lib/api-response";
import {
  deleteAppointment,
  FrontDeskError,
  updateAppointment,
} from "@/lib/front-desk";

export const dynamic = "force-dynamic";

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

  return handleStaff((doctorId) => {
    if (!body.appointment_datetime && !body.status) {
      throw new FrontDeskError(400, "Aucune modification fournie.");
    }
    return updateAppointment(doctorId, params.id, body);
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  return handleStaff((doctorId) => {
    if (!body.status) throw new FrontDeskError(400, "Statut manquant.");
    return updateAppointment(doctorId, params.id, { status: body.status });
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return handleStaff((doctorId) => deleteAppointment(doctorId, params.id));
}
