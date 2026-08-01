import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { Scheduler } from "@/components/scheduler/scheduler";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda — DoctorY",
};

export default async function AgendaPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  return (
    <AppShell staff={staff}>
      <Scheduler />
    </AppShell>
  );
}
