import { handleStaff } from "@/lib/api-response";
import { createPatient, FrontDeskError, listPatients } from "@/lib/front-desk";
import type { PatientAdminInput } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const search = new URL(req.url).searchParams.get("search") ?? "";
  return handleStaff((doctorId) => listPatients(doctorId, search));
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as PatientAdminInput & {
    force?: boolean;
  };

  return handleStaff((doctorId) => {
    if (!body.last_name?.trim()) {
      throw new FrontDeskError(400, "Le nom est obligatoire.");
    }
    return createPatient(doctorId, body);
  });
}
