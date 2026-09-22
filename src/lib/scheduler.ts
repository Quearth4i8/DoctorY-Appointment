import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { AppointmentStatus } from "@/types";

// Clinic working window shown on the grid.
export const DAY_START_MIN = 8 * 60; // 08:00
export const DAY_END_MIN = 20 * 60; // 20:00
export const SLOT_MIN = 30; // grid granularity
export const PX_PER_MIN = 1.4; // vertical scale of the grid
export const SLOT_PX = SLOT_MIN * PX_PER_MIN;

export const BACKEND_DT = "yyyy-MM-dd HH:mm:ss";

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The list of slot start-minutes shown as rows. */
export function slotMinutes(): number[] {
  const out: number[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += SLOT_MIN) out.push(m);
  return out;
}

/** Monday-based 7-day week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export type CalendarView = "day" | "week" | "month";

/**
 * The days a view puts on screen, in order.
 *
 * Always a plain list, whatever the view, so everything downstream — the
 * fetch range, the past-day rules, the grid itself — works off one shape and
 * needs no idea which view it is serving.
 *
 * A month runs from the Monday on or before the 1st to the Sunday on or after
 * the last, so the grid is a whole number of weeks and never a ragged edge.
 * Those overflow days belong to the neighbouring months and are drawn faded,
 * but they are real days and their appointments are real.
 */
export function viewDays(anchor: Date, view: CalendarView): Date[] {
  if (view === "day") return [startOfDay(anchor)];
  if (view === "week") return weekDays(anchor);

  const first = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const count = differenceInCalendarDays(last, first) + 1;
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

/** One step forward or back, in whatever unit the current view counts in. */
export function stepAnchor(anchor: Date, view: CalendarView, dir: 1 | -1): Date {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, dir * 7);
  return addMonths(anchor, dir);
}

export function fmtDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Whether `day` falls before today — the one rule behind every "no going back"
 * check in the agenda, so they cannot drift apart.
 *
 * Day granularity, and deliberately not "earlier than now": the secretary
 * routinely records something that happened this morning, and a boundary that
 * crept forward through the day would make the grid start refusing its own
 * slots by the afternoon. Today is open all day; yesterday never is.
 */
export function isPastDay(day: Date): boolean {
  return isBefore(startOfDay(day), startOfDay(new Date()));
}

/** Today as "yyyy-MM-dd" — the `min` of a date input, and a comparable key. */
export function todayKey(): string {
  return fmtDateKey(new Date());
}

/** Parse the backend datetime string into a JS Date (local). */
export function parseApptDate(dt: string): Date {
  // Backend stores "YYYY-MM-DD HH:MM:SS"
  return parse(dt, BACKEND_DT, new Date());
}

/** Build a backend datetime string from a day + minute-of-day. */
export function buildApptDatetime(day: Date, minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return format(d, BACKEND_DT);
}

export type StatusMeta = {
  value: AppointmentStatus;
  label: string;
  dot: string; // bg color class for the dot
  block: string; // classes for the appointment block
  bar: string; // bg color class for the left accent strip
  badge: string; // classes for a small badge
};

/**
 * Light surfaces, saturated bars.
 *
 * The block backgrounds are the `-soft` step of each status token so a full
 * week of them stays calm and the patient's name keeps its contrast; the
 * status is carried by the solid accent bar down the left edge, which is
 * legible at a glance even on a block squeezed to 22px. Colouring the whole
 * block strongly instead made a busy day read as an alarm.
 *
 * Named by meaning rather than hue, and the same four the annuaire uses, so a
 * confirmed appointment is the same green in the agenda, in the request queue
 * and on a public profile — and dark mode follows without a second table.
 */
export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  a_venir: {
    value: "a_venir",
    label: "À venir",
    dot: "bg-info",
    block: "bg-info-soft border-info/25 text-info-foreground hover:border-info/45",
    bar: "bg-info",
    badge: "bg-info-soft text-info-foreground border border-info/25",
  },
  approuve: {
    value: "approuve",
    label: "Confirmé",
    dot: "bg-ok",
    block: "bg-ok-soft border-ok/25 text-ok-foreground hover:border-ok/45",
    bar: "bg-ok",
    badge: "bg-ok-soft text-ok-foreground border border-ok/25",
  },
  passe: {
    value: "passe",
    label: "Passé",
    dot: "bg-muted-foreground",
    // Deliberately the quietest of the four: it is the state most blocks end up
    // in, and history should recede behind what is still to come.
    block:
      "bg-muted border-border text-muted-foreground hover:border-muted-foreground/40",
    bar: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border border-border",
  },
  annule: {
    value: "annule",
    label: "Annulé",
    dot: "bg-danger",
    block:
      "bg-danger-soft border-danger/25 text-danger-foreground hover:border-danger/45 line-through decoration-danger/50",
    bar: "bg-danger",
    badge: "bg-danger-soft text-danger-foreground border border-danger/25",
  },
};

export const STATUS_ORDER: AppointmentStatus[] = [
  "a_venir",
  "approuve",
  "passe",
  "annule",
];

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[(status as AppointmentStatus)] ?? STATUS_META.a_venir;
}

/**
 * What an appointment reads as right now, which is not always what is stored.
 *
 * "Passé" stopped being something the secretary sets. It is what an appointment
 * nobody touched turns into once its time has gone — so it is derived on
 * display rather than written, which means it is right the moment the clock
 * passes it, with no job to run and no row to update.
 *
 * Only `a_venir` ages this way. Confirmé and annulé are decisions somebody
 * made, and time going by does not undo a decision; a cancelled appointment
 * that has been and gone is still cancelled, not merely past.
 *
 * To the minute, deliberately — unlike `isPastDay`, which floors bookings at
 * the day. This one answers "has it happened yet", and at 15:00 this morning's
 * nine o'clock plainly has.
 */
export function effectiveStatus(appt: {
  appointment_datetime: string;
  status: AppointmentStatus;
}): AppointmentStatus {
  if (appt.status !== "a_venir") return appt.status;
  return parseApptDate(appt.appointment_datetime) < new Date()
    ? "passe"
    : "a_venir";
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];
