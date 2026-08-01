import { handleStaff } from "@/lib/api-response";
import { DoctorApiError, updatePatientAdmin } from "@/lib/doctor-api";
import type { PatientAdminInput } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Administrative edit of a patient.
 *
 * There is deliberately no DELETE handler here. Removing a patient from
 * doctor.db cascades through consultations, clinical exams, documents and CNAM
 * forms, so it stays an action only the doctor can take from the desktop app.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const body = (await req.json().catch(() => ({}))) as PatientAdminInput;

  return handleStaff((doctorId) => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      throw new DoctorApiError(400, "Identifiant invalide.");
    }
    if (!body.last_name?.trim()) {
      throw new DoctorApiError(400, "Le nom est obligatoire.");
    }
    return updatePatientAdmin(doctorId, id, {
      last_name: body.last_name.trim(),
      first_name: body.first_name?.trim() ?? "",
      father_name: body.father_name?.trim() ?? "",
      phone: body.phone?.trim() ?? "",
      gender: body.gender ?? "",
      age: body.age ?? null,
      address: body.address?.trim() ?? "",
      email: body.email?.trim() ?? "",
      job: body.job?.trim() ?? "",
      date_of_birth: body.date_of_birth?.trim() ?? "",
      insurance_type: body.insurance_type?.trim() ?? "",
      numero_dossier: body.numero_dossier?.trim() ?? "",
    });
  });
}
