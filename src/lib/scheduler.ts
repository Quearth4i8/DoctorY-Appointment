import {
  addDays,
  format,
  parse,
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

export function fmtDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
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

export const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  a_venir: {
    value: "a_venir",
    label: "À venir",
    dot: "bg-sky-500",
    block: "bg-sky-100 border-sky-300 text-sky-900 hover:border-sky-400",
    bar: "bg-sky-500",
    badge: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  approuve: {
    value: "approuve",
    label: "Confirmé",
    dot: "bg-emerald-500",
    block:
      "bg-emerald-100 border-emerald-300 text-emerald-900 hover:border-emerald-400",
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  passe: {
    value: "passe",
    label: "Passé",
    dot: "bg-slate-500",
    block: "bg-slate-200 border-slate-400 text-slate-700 hover:border-slate-500",
    bar: "bg-slate-500",
    badge: "bg-slate-200 text-slate-700 border border-slate-300",
  },
  annule: {
    value: "annule",
    label: "Annulé",
    dot: "bg-rose-500",
    block:
      "bg-rose-100 border-rose-300 text-rose-700 hover:border-rose-400 line-through decoration-rose-400/60",
    bar: "bg-rose-500",
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
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

export const DURATION_OPTIONS = [15, 30, 45, 60, 90];
