import type { DayHours } from "@/types";
import { toPracticeLocalMs } from "@/lib/absences";

/** One bookable moment on the public grid. */
export type PublicSlot = {
  /** Local wall-clock, "YYYY-MM-DDTHH:mm" — what the patient asked for. */
  at: string;
  taken: boolean;
};

export type PublicDay = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Opening hours for that day, so the grid can state them plainly. */
  ranges: [string, string][];
  /** Empty when the practice is closed that day. */
  slots: PublicSlot[];
  /**
   * Set when the doctor is away for part or all of that day's hours — the
   * reason shown to patients. Slots inside the absence are simply not offered.
   */
  absence?: { reason: string; note: string; wholeDay: boolean };
};

/** An absence as the public grid receives it (see public_absences()). */
export type PublicAbsence = { starts_at: string; ends_at: string; reason: string; note: string };

export const SLOT_MINUTES = 30;

/** Minimum notice: a slot starting sooner than this cannot be requested. */
export const MIN_NOTICE_MINUTES = 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 1 = Monday … 7 = Sunday, matching how hours are stored. */
export function isoDay(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Turns consultation hours + occupied ranges into the grid the public sees.
 *
 * Everything is computed against the server's local time, which is the
 * practice's time — the same clock doctor.db stores appointments in.
 */
export function buildAvailability({
  days,
  hours,
  busy,
  absences = [],
  now = new Date(),
  slotMinutes = SLOT_MINUTES,
}: {
  days: Date[];
  hours: DayHours[];
  busy: { start: string; end: string }[];
  /** Periods the doctor is away: no slot inside one is offered. */
  absences?: PublicAbsence[];
  now?: Date;
  slotMinutes?: number;
}): PublicDay[] {
  // Absences are instants; slots below are the practice's wall-clock times.
  // Bring the absences onto the same clock first (see toPracticeLocalMs).
  const awayMs = absences
    .map((a) => ({ ...a, start: toPracticeLocalMs(Date.parse(a.starts_at)), end: toPracticeLocalMs(Date.parse(a.ends_at)) }))
    .filter((a) => !Number.isNaN(a.start) && !Number.isNaN(a.end));
  const byDay = new Map(hours.map((h) => [h.day, h.ranges]));

  // Compare in epoch ms; the ranges arrive as ISO strings.
  const busyMs = busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end));

  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;

  return days.map((day) => {
    const ranges = byDay.get(isoDay(day)) ?? [];
    const slots: PublicSlot[] = [];
    const seen = new Set<number>();
    let skippedForAbsence = 0;
    let offered = 0;
    let absence: PublicDay["absence"];

    for (const [from, to] of ranges) {
      const startMin = minutesOf(from);
      const endMin = minutesOf(to);

      // The end of a range is the doctor's LAST available time, not the time
      // his last appointment must be over by: "09:00 – 12:00" offers 12:00.
      // `seen` keeps two touching ranges (…–12:00, 12:00–…) from both
      // offering the shared minute.
      for (let m = startMin; m <= endMin; m += slotMinutes) {
        if (seen.has(m)) continue;
        seen.add(m);
        const slotStart = new Date(day);
        slotStart.setHours(0, 0, 0, 0);
        slotStart.setMinutes(m);
        const startMs = slotStart.getTime();
        const endMs = startMs + slotMinutes * 60_000;

        // Too soon to be worth offering — the secretary could not call back
        // in time anyway.
        if (startMs < earliest) continue;

        // The doctor is away: not offered at all, as if outside opening hours.
        const away = awayMs.find((a) => startMs < a.end && endMs > a.start);
        if (away) {
          skippedForAbsence++;
          absence ??= { reason: away.reason, note: away.note, wholeDay: false };
          continue;
        }
        offered++;

        const taken = busyMs.some((b) => startMs < b.end && endMs > b.start);

        slots.push({
          at: `${dateKey(slotStart)}T${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}`,
          taken,
        });
      }
    }

    if (absence && offered === 0 && skippedForAbsence > 0) absence.wholeDay = true;

    return {
      date: dateKey(day),
      ranges: ranges.map((r) => [r[0], r[1]] as [string, string]),
      slots,
      ...(absence ? { absence } : {}),
    };
  });
}

export type CalendarView = "day" | "week" | "month";

/** Every day of `anchor`'s month. */
export function monthDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const out: Date[] = [];
  for (let d = new Date(first); d.getMonth() === first.getMonth(); d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
}

/**
 * The days a given view covers. Month starts on the 1st, not on a Monday —
 * the grid pads the leading blanks itself so the weekday columns line up.
 */
export function daysForView(view: CalendarView, anchor: Date): Date[] {
  if (view === "day") {
    const d = new Date(anchor);
    d.setHours(0, 0, 0, 0);
    return [d];
  }
  if (view === "month") return monthDays(anchor);
  return weekFrom(anchor);
}

/** The seven days starting from `anchor`'s Monday. */
export function weekFrom(anchor: Date): Date[] {
  const monday = new Date(anchor);
  monday.setHours(0, 0, 0, 0);
  const shift = (isoDay(monday) - 1) * -1;
  monday.setDate(monday.getDate() + shift);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
