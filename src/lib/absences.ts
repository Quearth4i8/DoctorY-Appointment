/**
 * Doctor absences — shared by the secretary's screens and the public pages.
 *
 * Stored as two instants (`starts_at` inclusive, `ends_at` exclusive). A
 * whole-day absence from the 12th to the 20th is 12th 00:00 → 21st 00:00, so
 * "does this slot fall inside?" is one half-open comparison everywhere.
 */

export type AbsenceReason = "conge" | "conference" | "formation" | "reunion" | "indisponible";

export type Absence = {
  id?: string;
  starts_at: string;
  ends_at: string;
  reason: AbsenceReason;
  note: string;
};

export const ABSENCE_REASONS: { value: AbsenceReason; label: string; publicLabel: string }[] = [
  { value: "conge", label: "Congés", publicLabel: "Congés" },
  { value: "conference", label: "Conférence / congrès", publicLabel: "Conférence" },
  { value: "formation", label: "Formation", publicLabel: "Formation" },
  { value: "reunion", label: "Réunion importante", publicLabel: "Réunion" },
  { value: "indisponible", label: "Autre indisponibilité", publicLabel: "Indisponible" },
];

export function reasonLabel(reason: string, audience: "staff" | "public" = "staff"): string {
  const r = ABSENCE_REASONS.find((x) => x.value === reason);
  if (!r) return "Absence";
  return audience === "public" ? r.publicLabel : r.label;
}

/** Whether [start, end) overlaps the absence. Epoch milliseconds. */
export function overlaps(a: Pick<Absence, "starts_at" | "ends_at">, startMs: number, endMs: number) {
  return startMs < Date.parse(a.ends_at) && endMs > Date.parse(a.starts_at);
}

/** The absence covering this instant, if any. */
export function absenceAt<T extends Pick<Absence, "starts_at" | "ends_at">>(
  absences: T[],
  ms: number,
): T | undefined {
  return absences.find((a) => ms >= Date.parse(a.starts_at) && ms < Date.parse(a.ends_at));
}

/** The practice's clock, whatever the server or the visitor's device is set to. */
export const PRACTICE_TZ = "Africa/Tunis";

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: PRACTICE_TZ });
const DAY_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: PRACTICE_TZ });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: PRACTICE_TZ });
const DATE_KEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: PRACTICE_TZ });
const DAY_NUM = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: PRACTICE_TZ });
const MONTH_KEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: PRACTICE_TZ });
const HM = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: PRACTICE_TZ });

const PARTS = new Intl.DateTimeFormat("en-CA", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23", timeZone: PRACTICE_TZ,
});

function practiceParts(ms: number) {
  const p = Object.fromEntries(PARTS.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

/**
 * An absence instant as the practice's wall-clock time, expressed in this
 * runtime's local time — so it can be compared with slots built by
 * `setHours()` on whatever machine runs the code.
 *
 * Slots and appointments are wall-clock times ("10:00"); absences are real
 * instants. On a server running in UTC, comparing the two directly slid every
 * absence an hour early (10:00–16:30 in Tunis blocked 09:00–15:30).
 */
export function toPracticeLocalMs(instantMs: number): number {
  const p = practiceParts(instantMs);
  return new Date(p.y, p.mo - 1, p.d, p.h, p.mi, p.s).getTime();
}

/** A practice wall-clock time ("2026-10-05T10:00") → the real instant. */
export function practiceWallToInstant(wall: string): number {
  const guess = Date.parse(`${wall.length === 16 ? `${wall}:00` : wall}Z`);
  const p = practiceParts(guess);
  const offset = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - guess;
  return guess - offset;
}

function isMidnight(d: Date): boolean {
  return HM.format(d) === "00:00";
}

function sameDay(a: Date, b: Date): boolean {
  return DATE_KEY.format(a) === DATE_KEY.format(b);
}

/** Whole days: starts and ends exactly at midnight. */
export function isAllDay(a: Pick<Absence, "starts_at" | "ends_at">): boolean {
  return isMidnight(new Date(a.starts_at)) && isMidnight(new Date(a.ends_at));
}

/**
 * "le lundi 12 octobre", "du 12 au 20 octobre", "le 12 octobre de 14:00 à
 * 17:00", "du 12 octobre 14:00 au 13 octobre 12:00" — whichever fits.
 */
export function formatAbsenceRange(a: Pick<Absence, "starts_at" | "ends_at">): string {
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);

  if (isAllDay(a)) {
    // ends_at is exclusive: the last day off is the day before.
    const last = new Date(end.getTime() - 1);
    if (sameDay(start, last)) return `le ${DAY.format(start)}`;
    // Same month: "du 12 au 20 octobre", not "du 12 octobre au 20 octobre".
    if (MONTH_KEY.format(start) === MONTH_KEY.format(last)) {
      return `du ${DAY_NUM.format(start)} au ${DAY_SHORT.format(last)}`;
    }
    return `du ${DAY_SHORT.format(start)} au ${DAY_SHORT.format(last)}`;
  }

  if (sameDay(start, end)) {
    return `le ${DAY.format(start)} de ${TIME.format(start)} à ${TIME.format(end)}`;
  }
  return `du ${DAY_SHORT.format(start)} ${TIME.format(start)} au ${DAY_SHORT.format(end)} ${TIME.format(end)}`;
}

/** When the doctor is back, for "Reprise le …" — only meaningful for whole days. */
export function returnDate(a: Pick<Absence, "starts_at" | "ends_at">): string | null {
  if (!isAllDay(a)) return null;
  return DAY.format(new Date(a.ends_at));
}
