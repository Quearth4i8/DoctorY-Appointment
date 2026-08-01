import { NextResponse } from "next/server";

import { getDoctorBySlug } from "@/lib/doctors";
import { DoctorApiError, listBusyRanges } from "@/lib/doctor-api";
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
 * Returns free/taken slots only. The upstream projection (listBusyRanges) has
 * already thrown away everything except two timestamps per appointment, so
 * there is no patient information in this response to leak.
 *
 * Degrades honestly: if the doctor's machine is unreachable the response says
 * so, and the page falls back to "ask for a day" rather than inventing slots
 * that may already be booked.
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
    const busy = await listBusyRanges(from, to);
    return NextResponse.json({
      view,
      from,
      to,
      days: buildAvailability({ days, hours: doctor.hours, busy }),
    });
  } catch (err) {
    if (err instanceof DoctorApiError && err.code === "BACKEND_UNREACHABLE") {
      return NextResponse.json(
        {
          view,
          from,
          to,
          days: [],
          unavailable: true,
          error:
            "Les créneaux ne sont pas consultables pour le moment. Vous pouvez tout de même demander un jour.",
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "Impossible de charger les créneaux." },
      { status: 500 },
    );
  }
}
