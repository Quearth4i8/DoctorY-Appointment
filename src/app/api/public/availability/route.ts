import { NextResponse } from "next/server";

import { getDoctorBySlug } from "@/lib/doctors";
import { listBusyRanges } from "@/lib/front-desk";
import {
  buildAvailability,
  dateKey,
  daysForView,
  type CalendarView,
} from "@/lib/availability";

export const dynamic = "force-dynamic";

const VIEWS: CalendarView[] = ["day", "week", "month"];

/**
 * Public availability for one doctor, over a day, a week or a month.
 *
 * Returns free/taken slots only. `public_busy_ranges` in the database throws
 * away everything except two timestamps per appointment, so there is no patient
 * information in this response to leak.
 *
 * The agenda lives in Supabase, so this works whether or not the doctor's PC is
 * on — which is the point: a visitor should never be told to come back later
 * because a machine in the cabinet is asleep.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const slug = params.get("slug") ?? "";

  const viewParam = params.get("view") as CalendarView | null;
  const view: CalendarView =
    viewParam && VIEWS.includes(viewParam) ? viewParam : "week";

  const doctor = await getDoctorBySlug(slug);
  if (!doctor || !doctor.is_published) {
    return NextResponse.json({ error: "Médecin introuvable." }, { status: 404 });
  }

  const dateParam = params.get("date");
  const anchor = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  if (Number.isNaN(anchor.getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const days = daysForView(view, anchor);
  const from = dateKey(days[0]);
  const to = dateKey(days[days.length - 1]);

  try {
    const busy = await listBusyRanges(doctor.id, from, to);
    return NextResponse.json({
      view,
      from,
      to,
      days: buildAvailability({ days, hours: doctor.hours, busy }),
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger les créneaux." },
      { status: 500 },
    );
  }
}
