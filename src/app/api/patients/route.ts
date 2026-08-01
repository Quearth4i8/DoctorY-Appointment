import { handleStaff } from "@/lib/api-response";
import { createPatient, DoctorApiError, searchPatients } from "@/lib/doctor-api";
import type { PatientAdminInput } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.get("search") ?? "";
  return handleStaff(() => searchPatients(search));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as PatientAdminInput & {
    force?: boolean;
  };

  return handleStaff(() => {
    if (!body.last_name?.trim()) {
      throw new DoctorApiError(400, "Le nom est obligatoire.");
    }
    return createPatient({
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
      force: body.force ?? false,
    });
  });
}
