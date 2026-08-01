import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { RequestsInbox } from "@/components/requests/requests-inbox";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demandes — DoctorY",
};

export default async function DemandesPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  return (
    <AppShell staff={staff}>
      <RequestsInbox />
    </AppShell>
  );
}
