import type { Metadata } from "next";

import { AbsencesManager } from "@/components/absences/absences-manager";
import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { resolveStaffDoctorId } from "@/lib/api-response";
import type { Absence } from "@/lib/absences";
import { createClient, getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Absences — DoctorY",
};

export default async function AbsencesPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  let doctorId: string | null = null;
  try {
    doctorId = await resolveStaffDoctorId(staff);
  } catch {
    doctorId = null;
  }

  // Current and upcoming, plus the last month for reference. RLS limits it
  // to this practice.
  let absences: Absence[] = [];
  let loadError = false;
  if (doctorId) {
    const since = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await createClient()
      .from("doctor_absences")
      .select("id, starts_at, ends_at, reason, note")
      .eq("doctor_id", doctorId)
      .gt("ends_at", since)
      .order("starts_at");
    if (error) loadError = true;
    absences = (data ?? []) as Absence[];
  }

  return (
    <AppShell staff={staff}>
      <AbsencesManager doctorId={doctorId} absences={absences} loadError={loadError} />
    </AppShell>
  );
}
