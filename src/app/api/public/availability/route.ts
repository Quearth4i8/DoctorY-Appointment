import { NextResponse } from "next/server";

import { getDoctorBySlug } from "@/lib/doctors";
import { getProviderAgenda } from "@/lib/providers";
import { listBusyRanges } from "@/lib/front-desk";
import {
  buildAvailability,
  dateKey,
  daysForView,
  type CalendarView,
} from "@/lib/availability";
import type { DayHours, HourRange, OpeningRange } from "@/types";

export const dynamic = "force-dynamic";

const VIEWS: CalendarView[] = ["day", "week", "month"];

/**
 * Public availability for one doctor or one establishment, over a day, a week
 * or a month.
 *
 * Returns free/taken slots only. `public_busy_ranges` in the database throws
 * away everything except two timestamps per appointment, so there is no patient
 * information in this response to leak.
 *
 * The agenda lives in Supabase, so this works whether or not the doctor's PC is
 * on — which is the point: a visitor should never be told to come back later
 * because a machine in the cabinet is asleep.
 *
 * Two ways in, because the annuaire and the old doctor pages address the same
 * agenda differently:
 *   ?slug=      a `doctors` row      (the legacy /medecins pages)
 *   ?provider=  a `providers` row    (the annuaire profile)
 * Both resolve to the same doctor id in the end, since appointments are still
 * keyed to a doctor.
 */

/** `opening_hours` rows → the `{day, ranges}` shape buildAvailability wants. */
function toDayHours(ranges: OpeningRange[]): DayHours[] {
  const byDay = new Map<number, HourRange[]>();
  for (const r of ranges) {
    const list = byDay.get(r.weekday) ?? [];
    list.push([r.opens_at, r.closes_at]);
    byDay.set(r.weekday, list);
  }
  return [...byDay.entries()].map(([day, list]) => ({ day, ranges: list }));
}

/**
 * The doctor id and published hours behind whichever handle was passed.
 *
 * `reason` is what to tell the caller when there is no agenda to read. It
 * matters that these are distinct: an establishment that simply does not run
 * the desktop app is not an error, and must not be reported as one.
 */
async function resolveAgenda(params: URLSearchParams): Promise<
  | { ok: true; doctorId: string; hours: DayHours[] }
  | { ok: false; status: number; reason: string }
> {
  const providerSlug = params.get("provider");

  if (providerSlug) {
    // Deliberately NOT getProviderBySlug: that loads practitioners, services
    // and specialties too, none of which an agenda needs, and this runs again
    // on every change of week or view.
    const agenda = await getProviderAgenda(providerSlug);
    if (!agenda) {
      return { ok: false, status: 404, reason: "Établissement introuvable." };
    }
    // Appointments are still keyed to a `doctors` row, so an establishment
    // created natively has nothing to be busy against. Returning "no agenda"
    // rather than an empty busy list is the whole point: an empty list would
    // render every opening hour as free, which is worse than showing nothing.
    if (agenda.bookingMode !== "agenda" || !agenda.legacyDoctorId) {
      return { ok: false, status: 409, reason: "Cet établissement ne publie pas d'agenda." };
    }
    return { ok: true, doctorId: agenda.legacyDoctorId, hours: toDayHours(agenda.hours) };
  }

  const doctor = await getDoctorBySlug(params.get("slug") ?? "");
  if (!doctor || !doctor.is_published) {
    return { ok: false, status: 404, reason: "Médecin introuvable." };
  }
  return { ok: true, doctorId: doctor.id, hours: doctor.hours };
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  const viewParam = params.get("view") as CalendarView | null;
  const view: CalendarView =
    viewParam && VIEWS.includes(viewParam) ? viewParam : "week";

  const agenda = await resolveAgenda(params);
  if (!agenda.ok) {
    return NextResponse.json(
      // 409 is "there is no agenda here", which the grid renders as an empty
      // state rather than as a failure.
      agenda.status === 409
        ? { unavailable: true, error: agenda.reason }
        : { error: agenda.reason },
      { status: agenda.status },
    );
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
    const busy = await listBusyRanges(agenda.doctorId, from, to);
    return NextResponse.json({
      view,
      from,
      to,
      days: buildAvailability({ days, hours: agenda.hours, busy }),
    });
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger les créneaux." },
      { status: 500 },
    );
  }
}
