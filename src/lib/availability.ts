import type { DayHours } from "@/types";

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
};

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
  now = new Date(),
  slotMinutes = SLOT_MINUTES,
}: {
  days: Date[];
  hours: DayHours[];
  busy: { start: string; end: string }[];
  now?: Date;
  slotMinutes?: number;
}): PublicDay[] {
  const byDay = new Map(hours.map((h) => [h.day, h.ranges]));

  // Compare in epoch ms; the ranges arrive as ISO strings.
  const busyMs = busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end));

  const earliest = now.getTime() + MIN_NOTICE_MINUTES * 60_000;

  return days.map((day) => {
    const ranges = byDay.get(isoDay(day)) ?? [];
    const slots: PublicSlot[] = [];

    for (const [from, to] of ranges) {
      const startMin = minutesOf(from);
      const endMin = minutesOf(to);

      for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
        const slotStart = new Date(day);
        slotStart.setHours(0, 0, 0, 0);
        slotStart.setMinutes(m);
        const startMs = slotStart.getTime();
        const endMs = startMs + slotMinutes * 60_000;

        // Too soon to be worth offering — the secretary could not call back
        // in time anyway.
        if (startMs < earliest) continue;

        const taken = busyMs.some((b) => startMs < b.end && endMs > b.start);

        slots.push({
          at: `${dateKey(slotStart)}T${pad(slotStart.getHours())}:${pad(slotStart.getMinutes())}`,
          taken,
        });
      }
    }

    return {
      date: dateKey(day),
      ranges: ranges.map((r) => [r[0], r[1]] as [string, string]),
      slots,
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
