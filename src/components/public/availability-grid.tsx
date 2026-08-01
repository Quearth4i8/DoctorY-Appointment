"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarOff, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import {
  dateKey,
  daysForView,
  type CalendarView,
  type PublicDay,
} from "@/lib/availability";

type Payload = {
  view: CalendarView;
  from: string;
  to: string;
  days: PublicDay[];
  unavailable?: boolean;
  error?: string;
};

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
};

/** Monday-first weekday initials for the month grid header. */
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AvailabilityGrid({ slug }: { slug: string }) {
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const days = daysForView(view, anchor);
  const dateParam = dateKey(days[0]);

  const { data, isLoading, isError } = useQuery<Payload>({
    queryKey: ["availability", slug, view, dateParam],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/availability?slug=${encodeURIComponent(slug)}&view=${view}&date=${dateParam}`,
      );
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const byDate = useMemo(
    () => new Map((data?.days ?? []).map((d) => [d.date, d])),
    [data],
  );

  /**
   * Row labels for the day/week grid: every distinct start time that exists
   * anywhere in the range, so a day that opens later simply has empty cells
   * rather than shifting the grid out of alignment.
   */
  const times = useMemo(() => {
    const set = new Set<string>();
    for (const d of data?.days ?? []) {
      for (const s of d.slots) set.add(s.at.slice(11));
    }
    return [...set].sort();
  }, [data]);

  function step(direction: 1 | -1) {
    setAnchor((d) =>
      view === "month"
        ? addMonths(d, direction)
        : addDays(d, direction * (view === "week" ? 7 : 1)),
    );
  }

  // Never let a patient page backwards past today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const atStart =
    view === "month"
      ? isSameMonth(days[0], today) || days[0] < today
      : days[days.length - 1] <= today;

  const label =
    view === "month"
      ? format(days[0], "MMMM yyyy", { locale: fr })
      : view === "day"
        ? format(days[0], "EEEE d MMMM yyyy", { locale: fr })
        : `${format(days[0], "d MMM", { locale: fr })} – ${format(days[6], "d MMM yyyy", { locale: fr })}`;

  function book(at: string) {
    router.push(
      `/demande?medecin=${encodeURIComponent(slug)}&at=${encodeURIComponent(at)}`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              disabled={atStart}
              onClick={() => step(-1)}
              aria-label="Précédent"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Suivant"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-sm font-semibold capitalize tabular-nums text-slate-800">
            {label}
          </span>

          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
        </div>

        {/* View switcher */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={[
                "h-8 rounded-md px-3 text-sm font-medium transition-colors",
                view === v
                  ? "bg-teal-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              ].join(" ")}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {data?.unavailable || isError ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {data?.error ??
              "Les créneaux ne sont pas consultables pour le moment."}{" "}
            Vous pouvez tout de même envoyer une demande en indiquant le jour qui
            vous arrange.
          </span>
        </div>
      ) : view === "month" ? (
        <MonthGrid
          days={days}
          byDate={byDate}
          loading={isLoading}
          onPickDay={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      ) : (
        <TimeGrid
          days={days}
          times={times}
          byDate={byDate}
          loading={isLoading}
          onBook={book}
        />
      )}

      <Legend />
    </div>
  );
}

/** Rectangular grid: days across the top, times down the side. */
function TimeGrid({
  days,
  times,
  byDate,
  loading,
  onBook,
}: {
  days: Date[];
  times: string[];
  byDate: Map<string, PublicDay>;
  loading: boolean;
  onBook: (at: string) => void;
}) {
  const today = new Date();

  if (loading) {
    return <div className="h-72 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (times.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Aucune consultation sur cette période.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-slim rounded-xl border border-slate-200">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-10 w-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Heure
            </th>
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <th
                  key={dateKey(d)}
                  className={[
                    "min-w-[104px] border-b border-slate-200 px-2 py-2.5 text-center",
                    isToday ? "bg-teal-50" : "",
                  ].join(" ")}
                >
                  <span className="block text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400">
                    {format(d, "EEE", { locale: fr })}
                  </span>
                  <span
                    className={[
                      "block text-sm font-semibold tabular-nums",
                      isToday ? "text-teal-700" : "text-slate-700",
                    ].join(" ")}
                  >
                    {format(d, "d MMM", { locale: fr })}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {times.map((time) => (
            <tr key={time} className="even:bg-slate-50/40">
              <th className="sticky left-0 z-10 border-r border-slate-200 bg-white px-2 py-1 text-xs font-medium tabular-nums text-slate-500">
                {time}
              </th>

              {days.map((d) => {
                const day = byDate.get(dateKey(d));
                const slot = day?.slots.find((s) => s.at.slice(11) === time);

                // No slot at all → outside opening hours that day.
                if (!slot) {
                  return (
                    <td
                      key={dateKey(d)}
                      className="border-l border-slate-100 p-1"
                    >
                      <div className="h-8 rounded-md bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgb(241_245_249)_5px,rgb(241_245_249)_10px)]" />
                    </td>
                  );
                }

                return (
                  <td key={dateKey(d)} className="border-l border-slate-100 p-1">
                    {slot.taken ? (
                      <div
                        title="Occupé"
                        className="flex h-8 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400"
                      >
                        Occupé
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBook(slot.at)}
                        className="h-8 w-full rounded-md border border-emerald-200 bg-emerald-50 text-xs font-semibold tabular-nums text-emerald-700 transition-colors hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"
                      >
                        {time}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Month overview: a date cell per day, showing how many slots are free. */
function MonthGrid({
  days,
  byDate,
  loading,
  onPickDay,
}: {
  days: Date[];
  byDate: Map<string, PublicDay>;
  loading: boolean;
  onPickDay: (d: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Monday-first: pad the leading blanks so columns line up with WEEKDAYS.
  const firstIso = ((days[0].getDay() + 6) % 7) as number;
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstIso }, () => null),
    ...days,
  ];

  if (loading) {
    return <div className="h-80 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-7 bg-slate-50">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-slate-200 px-2 py-2.5 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-slate-400"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) {
            return <div key={`pad-${i}`} className="min-h-[76px] bg-slate-50/40" />;
          }

          const day = byDate.get(dateKey(d));
          const free = day?.slots.filter((s) => !s.taken).length ?? 0;
          const past = d < today;
          const isToday = isSameDay(d, today);

          return (
            <button
              key={dateKey(d)}
              type="button"
              disabled={free === 0}
              onClick={() => onPickDay(d)}
              className={[
                "flex min-h-[76px] flex-col items-center justify-center gap-1 border-b border-r border-slate-100 p-2 transition-colors",
                free > 0
                  ? "hover:bg-emerald-50"
                  : "cursor-not-allowed bg-slate-50/40",
                isToday ? "ring-1 ring-inset ring-teal-500" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "text-sm font-semibold tabular-nums",
                  past ? "text-slate-300" : "text-slate-700",
                ].join(" ")}
              >
                {format(d, "d")}
              </span>

              {free > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums text-emerald-700">
                  {free} libre{free > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[0.7rem] text-slate-300">—</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded border border-emerald-200 bg-emerald-50" />
        Libre
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-slate-100" />
        Occupé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgb(241_245_249)_3px,rgb(241_245_249)_6px)]" />
        Fermé
      </span>
      <span className="ml-auto">
        Choisir un créneau envoie une <strong>demande</strong> : il n&apos;est pas
        réservé tant que le secrétariat ne vous a pas rappelé.
      </span>
    </div>
  );
}
