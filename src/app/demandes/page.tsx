import type { Metadata } from "next";

import type { AppointmentRequest } from "@/types";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { RequestsInbox } from "@/components/requests/requests-inbox";
import { resolveStaffDoctorId } from "@/lib/api-response";
import { listRequests } from "@/lib/front-desk";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demandes — DoctorY",
};

export default async function DemandesPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  // The pending tab, fetched here so the inbox paints with rows instead of
  // skeletons. A failure leaves it null and the client fetches as before.
  const initialPending = (await resolveStaffDoctorId(staff)
    .then((doctorId) => listRequests(doctorId, "en_attente"))
    .catch(() => null)) as AppointmentRequest[] | null;

  return (
    <AppShell staff={staff}>
      <RequestsInbox initialPending={initialPending} />
    </AppShell>
  );
}
