"use client";

import { useMemo } from "react";
import { format, isSameMonth, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  effectiveStatus,
  fmtDateKey,
  isPastDay,
  parseApptDate,
  statusMeta,
} from "@/lib/scheduler";
import type { Appointment } from "@/types";

/** Where a click on an empty day starts the new-appointment dialog. */
const DEFAULT_MINUTE = 9 * 60;

/**
 * How many fit in a cell before the rest collapse into a counter. Four keeps
 * every row the same height, which is what makes a month readable at a glance
 * — a cell that grew with its contents would shift every other cell around it.
 */
const MAX_VISIBLE = 4;

/**
 * The month view: what the month looks like, not what happens inside a day.
 *
 * Deliberately no drag-and-drop. A month cell has no time axis, so a drop could
 * only mean "this day, at some hour I have not told you" — and silently keeping
 * the old time while changing the date is the kind of guess that puts a patient
 * in front of a locked door. Moving an appointment stays in the day and week
 * views, where the target slot is a real time she can see.
 */
export function MonthGrid({
  days,
  anchor,
  appointments,
  onCreateSlot,
  onOpenAppointment,
  onOpenDay,
}: {
  days: Date[];
  /** Any date inside the month being shown; decides which days read as "other". */
  anchor: Date;
  appointments: Appointment[];
  onCreateSlot: (day: Date, minute: number) => void;
  onOpenAppointment: (a: Appointment) => void;
  /** Jump to the day view — how the overflow counter stops being a dead end. */
  onOpenDay: (day: Date) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(fmtDateKey(day), []);
    for (const a of appointments) {
      const key = a.appointment_datetime.slice(0, 10);
      map.get(key)?.push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) =>
        x.appointment_datetime.localeCompare(y.appointment_datetime),
      );
    }
    return map;
  }, [appointments, days]);

  const weekdayNames = days.slice(0, 7);

  return (
    <div className="overflow-x-auto scrollbar-slim rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="min-w-[720px]">
        {/* Weekday header — same grey chrome as the week grid, so switching
            views changes the content and not the furniture. */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {weekdayNames.map((day) => (
            <div
              key={`h-${fmtDateKey(day)}`}
              className="border-r border-border/70 py-2.5 text-center text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground/80 last:border-r-0"
            >
              {format(day, "EEE", { locale: fr })}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = fmtDateKey(day);
            const list = byDay.get(key) ?? [];
            const closed = isPastDay(day);
            const outside = !isSameMonth(day, anchor);
            const overflow = list.length - MAX_VISIBLE;

            return (
              <div
                key={key}
                onClick={closed ? undefined : () => onCreateSlot(day, DEFAULT_MINUTE)}
                className={cn(
                  "group relative min-h-[124px] border-b border-r border-border/70 p-2 transition-colors last:border-r-0",
                  closed
                    ? "cursor-not-allowed bg-muted/25"
                    : "hover:bg-accent/30",
                  outside && !closed && "bg-muted/15",
                  isToday(day) && "bg-accent/25",
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[0.8rem] font-semibold tnum",
                      isToday(day)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : outside || closed
                          ? "text-muted-foreground/60"
                          : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {closed ? null : (
                    <Plus className="h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-50" />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {list.slice(0, MAX_VISIBLE).map((a) => {
                    const meta = statusMeta(effectiveStatus(a));
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e) => {
                          // Otherwise the cell behind it opens "new appointment".
                          e.stopPropagation();
                          onOpenAppointment(a);
                        }}
                        className={cn(
                          "relative flex w-full items-center gap-1.5 overflow-hidden rounded-md border py-1 pl-2 pr-1.5 text-left text-[11px] font-medium shadow-sm transition-all duration-150 hover:-translate-y-px hover:shadow-card",
                          meta.block,
                        )}
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-[3px] rounded-l-md",
                            meta.bar,
                          )}
                        />
                        <span className="shrink-0 font-semibold tnum">
                          {format(parseApptDate(a.appointment_datetime), "HH:mm")}
                        </span>
                        <span className="truncate">{a.patient_name || "RDV"}</span>
                      </button>
                    );
                  })}

                  {overflow > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDay(day);
                      }}
                      className="rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      +{overflow} autre{overflow > 1 ? "s" : ""}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
