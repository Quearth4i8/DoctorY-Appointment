"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError, fetchWeek, updateAppointment } from "@/lib/client-api";
import {
  buildApptDatetime,
  type CalendarView,
  fmtDateKey,
  isPastDay,
  stepAnchor,
  viewDays,
} from "@/lib/scheduler";
import type { Appointment } from "@/types";
import { WeekGrid } from "./week-grid";
import { MonthGrid } from "./month-grid";
import { StatusLegend } from "./status-legend";
import { NewAppointmentDialog, type SlotTarget } from "./new-appointment-dialog";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

// Shared by both segmented controls, so "selected" looks identical in each and
// the two groups read as one toolbar rather than two lookalikes.
const SEG_BTN =
  "h-9 rounded-lg px-3.5 text-sm font-medium transition-all duration-150";
const SEG_ON = "bg-primary/10 text-primary shadow-inner-sm";
const SEG_OFF = "text-muted-foreground hover:bg-secondary hover:text-foreground";
const NAV_BTN =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

// The arrows move by whatever the view counts in, so they have to say so.
const PREV_LABEL: Record<CalendarView, string> = {
  day: "Jour précédent",
  week: "Semaine précédente",
  month: "Mois précédent",
};
const NEXT_LABEL: Record<CalendarView, string> = {
  day: "Jour suivant",
  week: "Semaine suivante",
  month: "Mois suivant",
};

export function Scheduler() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newTarget, setNewTarget] = useState<SlotTarget | null>(null);

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const days = useMemo(() => viewDays(anchor, view), [anchor, view]);
  // Whatever the view, the range is simply the days on screen — including a
  // month's overflow days, whose appointments are shown and so must be fetched.
  const from = fmtDateKey(days[0]);
  const to = fmtDateKey(days[days.length - 1]);

  const { data: appointments = [], isLoading, isError, error, refetch } =
    useQuery({
      queryKey: ["week", from, to],
      queryFn: () => fetchWeek(from, to),
    });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["week"] });
  }

  function openNew(day: Date, minute: number) {
    setNewTarget({ day, minute });
    setNewOpen(true);
  }

  function openDetails(a: Appointment) {
    setSelected(a);
    setDetailsOpen(true);
  }

  async function handleReschedule(appt: Appointment, day: Date, minute: number) {
    // The grid already refuses to accept a drop on a past day, so this is the
    // belt to that braces — but it is also what turns a silent no-op into an
    // explanation, if a drop ever gets through.
    if (isPastDay(day)) {
      toast.error("Impossible de déplacer un rendez-vous vers une date passée.");
      return;
    }

    const previous = appointments;
    // Optimistic move so the card snaps to the new slot immediately.
    const optimistic = appointments.map((a) =>
      a.id === appt.id
        ? { ...a, appointment_datetime: buildApptDatetime(day, minute) }
        : a,
    );
    qc.setQueryData(["week", from, to], optimistic);
    try {
      await updateAppointment(appt.id, {
        appointment_datetime: buildApptDatetime(day, minute),
        duration_minutes: appt.duration_minutes,
        status: appt.status,
        notes: appt.notes,
      });
      toast.success("Rendez-vous déplacé.");
      invalidate();
    } catch (err) {
      qc.setQueryData(["week", from, to], previous); // revert
      toast.error(
        err instanceof ApiError ? err.message : "Déplacement impossible.",
      );
    }
  }

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return format(days[0], "EEEE d MMMM yyyy", { locale: fr });
    }
    if (view === "month") {
      return format(anchor, "MMMM yyyy", { locale: fr });
    }
    const last = days[days.length - 1];
    if (days[0].getMonth() === last.getMonth()) {
      return `${format(days[0], "d", { locale: fr })} – ${format(last, "d MMMM yyyy", { locale: fr })}`;
    }
    return `${format(days[0], "d MMM", { locale: fr })} – ${format(last, "d MMM yyyy", { locale: fr })}`;
  }, [days, view, anchor]);

  const todayInView = isWithinInterval(new Date(), {
    start: days[0],
    end: addDays(days[days.length - 1], 1),
  });

  // History stays reachable — she has to be able to look back at what was
  // booked. It just cannot be changed, which the grids enforce day by day.
  const wholeRangePast = isPastDay(days[days.length - 1]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
              Agenda
            </h1>
            <p className="mt-1.5 text-sm font-medium capitalize text-muted-foreground tnum">
              {rangeLabel}
            </p>
          </div>

          <Button
            size="lg"
            className="gap-2 shadow-card transition-shadow hover:shadow-card-hover"
            onClick={() => {
              setNewTarget(null);
              setNewOpen(true);
            }}
          >
            <CalendarPlus className="h-[1.1rem] w-[1.1rem]" /> Nouveau rendez-vous
          </Button>
        </div>

        {/* Navigation and view — one toolbar, so the controls read as a set
            rather than as things that happen to sit near each other. */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            {/* Segmented control: prev · today · next reads as one object. */}
            <div className="flex items-center rounded-xl border border-border/70 bg-card p-1 shadow-card">
              <button
                type="button"
                onClick={() => setAnchor((d) => stepAnchor(d, view, -1))}
                aria-label={PREV_LABEL[view]}
                title={PREV_LABEL[view]}
                className={NAV_BTN}
              >
                <ChevronLeft className="h-[1.15rem] w-[1.15rem]" />
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className={cn(
                  SEG_BTN,
                  todayInView ? SEG_ON : SEG_OFF,
                )}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setAnchor((d) => stepAnchor(d, view, 1))}
                aria-label={NEXT_LABEL[view]}
                title={NEXT_LABEL[view]}
                className={NAV_BTN}
              >
                <ChevronRight className="h-[1.15rem] w-[1.15rem]" />
              </button>
            </div>

            {/* Jour · Semaine · Mois */}
            <div className="flex items-center rounded-xl border border-border/70 bg-card p-1 shadow-card">
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setView(v.value)}
                  aria-pressed={view === v.value}
                  className={cn(SEG_BTN, view === v.value ? SEG_ON : SEG_OFF)}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Without this, a range that quietly ignores every click reads as
                broken rather than as history. */}
            {wholeRangePast ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                <Lock className="h-3.5 w-3.5" />
                Lecture seule
              </span>
            ) : null}

            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>
      </header>

      {/* Connection error */}
      {isError ? (
        <div className="flex animate-scale-in items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-destructive">
          <span className="flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4 shrink-0" />
            {error instanceof ApiError
              ? error.message
              : "Impossible de joindre l'application du médecin."}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : null}

      {/* Calendar. The month has no time axis, so it gets its own grid; day and
          week are the same time grid with a different number of columns. */}
      {view === "month" ? (
        <MonthGrid
          days={days}
          anchor={anchor}
          appointments={appointments}
          onCreateSlot={openNew}
          onOpenAppointment={openDetails}
          onOpenDay={(day) => {
            setAnchor(day);
            setView("day");
          }}
        />
      ) : (
        <WeekGrid
          days={days}
          appointments={appointments}
          onCreateSlot={openNew}
          onOpenAppointment={openDetails}
          onReschedule={handleReschedule}
          activeId={activeId}
          setActiveId={setActiveId}
        />
      )}

      <StatusLegend />

      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        target={newTarget}
        onCreated={invalidate}
      />
      <AppointmentDetailsDialog
        appointment={selected}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onChanged={invalidate}
      />
    </div>
  );
}
