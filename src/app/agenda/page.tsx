import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { Scheduler } from "@/components/scheduler/scheduler";
import { resolveStaffDoctorId } from "@/lib/api-response";
import { listAppointments } from "@/lib/front-desk";
import { fmtDateKey, viewDays } from "@/lib/scheduler";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agenda — DoctorY",
};

export default async function AgendaPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  /*
   * The first week, fetched here instead of by the browser.
   *
   * Rendering the shell and letting the client go and get its own data meant
   * the agenda appeared empty for a full round trip — browser to this server,
   * this server to Supabase, and back — on top of the two the page had already
   * spent proving who she is. Since the server is already authenticated and
   * already talking to Supabase, it may as well bring the week with it.
   *
   * A failure here is not fatal: `initialWeek` stays null and the client
   * fetches exactly as it did before.
   */
  const days = viewDays(new Date(), "week");
  const from = fmtDateKey(days[0]);
  const to = fmtDateKey(days[days.length - 1]);

  const initialWeek = await resolveStaffDoctorId(staff)
    .then(async (doctorId) => ({
      from,
      to,
      appointments: await listAppointments(doctorId, from, to),
    }))
    .catch(() => null);

  return (
    <AppShell staff={staff}>
      <Scheduler initialWeek={initialWeek} />
    </AppShell>
  );
}
