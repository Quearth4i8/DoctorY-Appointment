import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { PatientsManager } from "@/components/patients/patients-manager";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patients — DoctorY",
};

export default async function PatientsPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  return (
    <AppShell staff={staff}>
      <PatientsManager />
    </AppShell>
  );
}
