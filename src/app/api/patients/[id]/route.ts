import { handleStaff } from "@/lib/api-response";
import { FrontDeskError, updatePatient } from "@/lib/front-desk";
import type { PatientAdminInput } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Administrative edit of a patient.
 *
 * There is deliberately no DELETE handler here. Removing a patient cascades
 * through consultations, clinical exams, documents and CNAM forms in doctor.db,
 * so it stays an action only the doctor can take from the desktop app.
 *
 * The change lands in Supabase and is flagged for his app, which writes it into
 * doctor.db on its next sync — so it works whether or not his PC is on.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as PatientAdminInput;

  return handleStaff((doctorId) => {
    if (!body.last_name?.trim()) {
      throw new FrontDeskError(400, "Le nom est obligatoire.");
    }
    return updatePatient(doctorId, params.id, body);
  });
}
