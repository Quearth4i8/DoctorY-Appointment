import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { PatientsManager } from "@/components/patients/patients-manager";
import { resolveStaffDoctorId } from "@/lib/api-response";
import { listPatients } from "@/lib/front-desk";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patients — DoctorY",
};

export default async function PatientsPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  // The unfiltered list — what the page shows before anyone types.
  const initialPatients = await resolveStaffDoctorId(staff)
    .then((doctorId) => listPatients(doctorId, ""))
    .catch(() => null);

  return (
    <AppShell staff={staff}>
      <PatientsManager initialPatients={initialPatients} />
    </AppShell>
  );
}
