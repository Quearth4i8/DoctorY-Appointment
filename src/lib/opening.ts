import type { DayHours } from "@/types";

/**
 * "Is the cabinet open right now, and if not, when does it open next?" —
 * from the doctor's weekly hours (1 = Monday … 7 = Sunday, "HH:mm" ranges).
 *
 * Used to tell a patient sending a request at 23:00 on a Saturday that it
 * will be read on Monday morning, not "soon".
 */

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isoDay(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

export type OpeningState = {
  openNow: boolean;
  /** Next moment the cabinet opens, when it is closed now. Null if no hours at all. */
  nextOpening: Date | null;
};

export function openingState(hours: DayHours[], now: Date = new Date()): OpeningState {
  const byDay = new Map(hours.map((h) => [h.day, h.ranges]));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const today = byDay.get(isoDay(now)) ?? [];
  const openNow = today.some(([a, b]) => nowMin >= minutes(a) && nowMin < minutes(b));
  if (openNow) return { openNow: true, nextOpening: null };

  // Look ahead up to a week (plus today's later ranges).
  for (let offset = 0; offset <= 7; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const ranges = (byDay.get(isoDay(day)) ?? [])
      .map(([a]) => minutes(a))
      .filter((start) => offset > 0 || start > nowMin)
      .sort((x, y) => x - y);
    if (ranges.length) {
      const at = new Date(day);
      at.setHours(Math.floor(ranges[0] / 60), ranges[0] % 60, 0, 0);
      return { openNow: false, nextOpening: at };
    }
  }
  return { openNow: false, nextOpening: null };
}
