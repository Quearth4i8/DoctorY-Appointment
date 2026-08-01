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
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError, fetchWeek, updateAppointment } from "@/lib/client-api";
import {
  buildApptDatetime,
  fmtDateKey,
  STATUS_META,
  STATUS_ORDER,
  weekDays,
} from "@/lib/scheduler";
import type { Appointment } from "@/types";
import { WeekGrid } from "./week-grid";
import { NewAppointmentDialog, type SlotTarget } from "./new-appointment-dialog";
import { AppointmentDetailsDialog } from "./appointment-details-dialog";

export function Scheduler() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newTarget, setNewTarget] = useState<SlotTarget | null>(null);

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const from = fmtDateKey(days[0]);
  const to = fmtDateKey(days[6]);

  const { data: appointments = [], isLoading, isError, error, refetch } =
    useQuery({
      queryKey: ["week", from, to],
      queryFn: () => fetchWeek(from, to),
    });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["week"] });
  }

  async function handleReschedule(appt: Appointment, day: Date, minute: number) {
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

  const weekLabel = useMemo(() => {
    const sameMonth =
      days[0].getMonth() === days[6].getMonth();
    if (sameMonth) {
      return `${format(days[0], "d", { locale: fr })} – ${format(days[6], "d MMMM yyyy", { locale: fr })}`;
    }
    return `${format(days[0], "d MMM", { locale: fr })} – ${format(days[6], "d MMM yyyy", { locale: fr })}`;
  }, [days]);

  const todayInView = isWithinInterval(new Date(), {
    start: days[0],
    end: addDays(days[6], 1),
  });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">
              Agenda
            </h1>
            <p className="mt-0.5 text-sm capitalize text-muted-foreground tnum">
              {weekLabel}
            </p>
          </div>

          <Button
            size="lg"
            className="gap-2"
            onClick={() => {
              setNewTarget(null);
              setNewOpen(true);
            }}
          >
            <CalendarPlus className="h-[1.1rem] w-[1.1rem]" /> Nouveau rendez-vous
          </Button>
        </div>

        {/* Week navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Segmented control: prev · today · next reads as one object. */}
            <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-card">
              <button
                type="button"
                onClick={() => setAnchor((d) => addDays(d, -7))}
                aria-label="Semaine précédente"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="h-[1.15rem] w-[1.15rem]" />
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className={cn(
                  "h-9 rounded-md px-3.5 text-sm font-medium transition-colors",
                  todayInView
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setAnchor((d) => addDays(d, 7))}
                aria-label="Semaine suivante"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronRight className="h-[1.15rem] w-[1.15rem]" />
              </button>
            </div>

            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.8rem]">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                {STATUS_META[s].label}
              </span>
            ))}
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

      {/* Calendar */}
      <WeekGrid
        days={days}
        appointments={appointments}
        onCreateSlot={(day, minute) => {
          setNewTarget({ day, minute });
          setNewOpen(true);
        }}
        onOpenAppointment={(a) => {
          setSelected(a);
          setDetailsOpen(true);
        }}
        onReschedule={handleReschedule}
        activeId={activeId}
        setActiveId={setActiveId}
      />

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
