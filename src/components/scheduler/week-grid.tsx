"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  durationLabel,
  effectiveStatus,
  fmtDateKey,
  isPastDay,
  minutesToLabel,
  PX_PER_MIN,
  parseApptDate,
  SLOT_MIN,
  SLOT_PX,
  slotMinutes,
  statusMeta,
} from "@/lib/scheduler";
import type { Appointment } from "@/types";
import { reasonLabel, toPracticeLocalMs, type Absence } from "@/lib/absences";

const GRID_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;

/** Width of the time gutter, shared by the header corner and the body column. */
const GUTTER = 68;

type Positioned = {
  appt: Appointment;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  startMin: number;
};

/** A block is never drawn shorter than this, so its one line stays readable. */
const MIN_BLOCK_PX = 30;

/** Lay out a day's appointments into side-by-side lanes when they overlap. */
function layoutDay(appts: Appointment[]): Positioned[] {
  const items = appts
    .map((appt) => {
      const d = parseApptDate(appt.appointment_datetime);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const endMin = startMin + (appt.duration_minutes || 30);
      // Lanes go by how long the block is *drawn*: a 10-minute visit is
      // drawn as tall as ~16 minutes, and would otherwise cover the one
      // booked right after it instead of sitting beside it.
      const drawnEnd = Math.max(endMin, startMin + Math.ceil(MIN_BLOCK_PX / PX_PER_MIN));
      return { appt, startMin, endMin: drawnEnd, realEnd: endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: Positioned[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy column assignment within the cluster.
    const laneEnds: number[] = [];
    const laneOf = new Map<Appointment, number>();
    for (const it of cluster) {
      let lane = laneEnds.findIndex((e) => e <= it.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endMin);
      } else {
        laneEnds[lane] = it.endMin;
      }
      laneOf.set(it.appt, lane);
    }
    const lanes = laneEnds.length;
    for (const it of cluster) {
      const clampedStart = Math.max(it.startMin, DAY_START_MIN);
      const clampedEnd = Math.min(it.realEnd, DAY_END_MIN);
      out.push({
        appt: it.appt,
        top: (clampedStart - DAY_START_MIN) * PX_PER_MIN,
        height: Math.max((clampedEnd - clampedStart) * PX_PER_MIN, MIN_BLOCK_PX),
        lane: laneOf.get(it.appt) ?? 0,
        lanes,
        startMin: it.startMin,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length > 0 && it.startMin >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.endMin);
  }
  flush();
  return out;
}

/**
 * What a block says, by how much room it has. Everything is on one line for a
 * short visit; a longer one puts the patient first, in bold, with the times
 * under it, then the note and the status as the height allows.
 */
function BlockContent({ appt, height }: { appt: Appointment; height: number }) {
  const meta = statusMeta(effectiveStatus(appt));
  const start = parseApptDate(appt.appointment_datetime);
  const duration = appt.duration_minutes || 30;
  const end = new Date(start.getTime() + duration * 60_000);
  const name = appt.patient_name || "Rendez-vous";
  const dossier = appt.patient_numero_dossier ? (
    <span
      className="shrink-0 rounded-md bg-card/70 px-1.5 py-0.5 font-mono text-[10.5px] font-bold leading-none tracking-tight ring-1 ring-inset ring-black/[0.08] dark:ring-white/10"
      title="N° de dossier"
    >
      N°&nbsp;{appt.patient_numero_dossier}
    </span>
  ) : null;

  if (height < 40) {
    return (
      // The name is what she scans for: it keeps its room; the dossier number
      // stays on the right.
      <div className="flex h-full min-w-0 items-center gap-1.5 overflow-hidden text-[12.5px] leading-none">
        <span className="shrink-0 font-bold tnum">{format(start, "HH:mm")}</span>
        <span className="min-w-[3rem] flex-1 truncate font-semibold">{name}</span>
        {dossier}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-w-0 flex-col", height < 60 ? "gap-0.5" : "gap-1")}>
      <div className="flex min-w-0 items-start gap-2">
        <p className="min-w-0 flex-1 truncate text-[14px] font-bold leading-tight">{name}</p>
        {dossier}
      </div>
      <p className="truncate text-[12px] font-medium leading-snug opacity-80 tnum">
        {format(start, "HH:mm")} – {format(end, "HH:mm")}
        <span className="mx-1 opacity-50">·</span>
        {durationLabel(duration)}
      </p>
      {height >= 66 && appt.notes ? (
        <p className="flex min-w-0 items-center gap-1 text-[11.5px] leading-snug opacity-75">
          <StickyNote className="h-3 w-3 shrink-0" />
          <span className="truncate">{appt.notes}</span>
        </p>
      ) : null}
      {height >= 110 ? (
        <span className="mt-auto inline-flex items-center gap-1 self-start text-[10.5px] font-semibold opacity-80">
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      ) : null}
    </div>
  );
}

function AppointmentBlock({
  pos,
  locked,
  onOpen,
  dragging,
}: {
  pos: Positioned;
  /** The day has gone: it can be opened and read, never moved. */
  locked: boolean;
  onOpen: (a: Appointment) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(pos.appt.id),
    data: { appt: pos.appt },
    disabled: locked,
  });
  const meta = statusMeta(effectiveStatus(pos.appt));
  const widthPct = 100 / pos.lanes;
  const compact = pos.height < 40;
  const start = parseApptDate(pos.appt.appointment_datetime);
  const duration = pos.appt.duration_minutes || 30;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(pos.appt)}
      style={{
        // One pixel of air above and below, so back-to-back visits read as
        // two blocks rather than one long one.
        top: pos.top + 1,
        height: pos.height - 2,
        left: `calc(${pos.lane * widthPct}% + 4px)`,
        width: `calc(${widthPct}% - 8px)`,
      }}
      className={cn(
        "group/appt absolute z-10 touch-none select-none overflow-hidden rounded-lg border pl-3.5 pr-2 text-left shadow-sm transition-all duration-150 ease-spring",
        // A quarter-hour (45px) still fits the name and the times.
        compact ? "py-0" : pos.height < 60 ? "py-1" : "py-2",
        locked
          ? "cursor-pointer"
          : "cursor-grab hover:z-[11] hover:-translate-y-px hover:shadow-card-hover active:cursor-grabbing",
        meta.block,
        (isDragging || dragging) && "opacity-40",
      )}
      title={[
        pos.appt.patient_name || "Rendez-vous",
        pos.appt.patient_numero_dossier ? `N° ${pos.appt.patient_numero_dossier}` : null,
        format(start, "HH:mm"),
        durationLabel(duration),
        pos.appt.notes,
      ].filter(Boolean).join(" · ")}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[5px] rounded-l-lg", meta.bar)} />
      <BlockContent appt={pos.appt} height={pos.height} />
    </div>
  );
}

/** Where the clock is, on today's column: the practice's wall-clock time. */
function NowLine({ nowMin }: { nowMin: number }) {
  if (nowMin < DAY_START_MIN || nowMin > DAY_END_MIN) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[12] flex items-center"
      style={{ top: (nowMin - DAY_START_MIN) * PX_PER_MIN - 1 }}
    >
      <span className="-ml-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-danger shadow-[0_0_0_2px_hsl(var(--card))]" />
      <span className="h-0.5 flex-1 bg-danger" />
    </div>
  );
}

function SlotCell({
  dateKey,
  minute,
  closed,
  onCreate,
}: {
  dateKey: string;
  minute: number;
  /** The day has gone: nothing may be booked or dropped here. */
  closed: boolean;
  onCreate: (dateKey: string, minute: number) => void;
}) {
  // Disabling the droppable is what actually blocks a drag: dnd-kit then never
  // reports this cell as a target, so a drop over it resolves to nothing.
  const { setNodeRef, isOver } = useDroppable({
    id: `${dateKey}|${minute}`,
    disabled: closed,
  });
  // Each cell draws the line at its own start, so the solid line is where the
  // hour label is. (Bottom borders put the hour's line at :30.) Hours solid,
  // half-hours dashed, quarters only felt on hover.
  const line =
    minute === DAY_START_MIN
      ? "border-t-transparent"
      : minute % 60 === 0
        ? "border-t-border"
        : minute % 30 === 0
          ? "border-dashed border-t-border/60"
          : "border-t-transparent";
  return (
    <div
      ref={setNodeRef}
      onClick={closed ? undefined : () => onCreate(dateKey, minute)}
      style={{ height: SLOT_PX }}
      className={cn(
        "group relative border-t transition-colors",
        line,
        closed
          ? "cursor-not-allowed"
          : isOver
            ? "bg-primary/10 ring-2 ring-inset ring-primary/60"
            : "hover:bg-accent/50",
      )}
    >
      {closed ? null : (
        <span className="pointer-events-none absolute inset-0 flex items-center gap-1 px-2 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-70 tnum">
          <Plus className="h-3.5 w-3.5" />
          {minutesToLabel(minute)}
        </span>
      )}
    </div>
  );
}

export function WeekGrid({
  days,
  appointments,
  onCreateSlot,
  onOpenAppointment,
  onReschedule,
  activeId,
  setActiveId,
  absences = [],
}: {
  days: Date[];
  appointments: Appointment[];
  /** The doctor's absences: drawn as hatched bands behind the day's slots. */
  absences?: Absence[];
  onCreateSlot: (day: Date, minute: number) => void;
  onOpenAppointment: (a: Appointment) => void;
  onReschedule: (appt: Appointment, day: Date, minute: number) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const slots = slotMinutes();

  // The practice's wall clock, to the minute, for the "now" line.
  const [now, setNow] = useState(() => new Date(toPracticeLocalMs(Date.now())));
  useEffect(() => {
    const id = setInterval(() => setNow(new Date(toPracticeLocalMs(Date.now()))), 30_000);
    return () => clearInterval(id);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showsToday = days.some((d) => isSameDay(d, now));

  // Open on the part of the day that matters: an hour before now when today
  // is on screen, otherwise the first appointment, otherwise the morning.
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstKey = days.length ? fmtDateKey(days[0]) : "";
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    let target = DAY_START_MIN;
    if (showsToday) target = nowMin - 60;
    else {
      const starts = appointments.map((a) => {
        const d = parseApptDate(a.appointment_datetime);
        return d.getHours() * 60 + d.getMinutes();
      });
      if (starts.length) target = Math.min(...starts) - 30;
    }
    target = Math.min(Math.max(target, DAY_START_MIN), DAY_END_MIN);
    // A jump on first load (nothing to animate from), a glide only when the
    // week or day actually changed — a re-run for the same days jumps too.
    const moved = lastKey.current !== null && lastKey.current !== firstKey;
    lastKey.current = firstKey;
    box.scrollTo({
      top: (target - DAY_START_MIN) * PX_PER_MIN,
      behavior: moved ? "smooth" : "auto",
    });
    // Only when the days change (a new week, a new view) — not on every
    // refresh, which would yank the agenda away from where she was looking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, days.length]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(fmtDateKey(day), []);
    for (const a of appointments) {
      const key = a.appointment_datetime.slice(0, 10);
      if (map.has(key)) map.get(key)!.push(a);
    }
    return map;
  }, [appointments, days]);

  const activeAppt = activeId
    ? appointments.find((a) => a.id === activeId) ?? null
    : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const appt = appointments.find((a) => a.id === String(active.id));
    if (!appt) return;
    const [dateKey, minStr] = String(over.id).split("|");
    const minute = Number(minStr);
    const day = days.find((d) => fmtDateKey(d) === dateKey);
    if (!day || isPastDay(day)) return;
    // No-op if dropped on its current start.
    const cur = parseApptDate(appt.appointment_datetime);
    if (
      isSameDay(cur, day) &&
      cur.getHours() * 60 + cur.getMinutes() === minute
    ) {
      return;
    }
    onReschedule(appt, day, minute);
  }

  // Serves the day view as well as the week, so the column count comes from the
  // days it was handed rather than from a 7 baked into a class name. One day
  // gets the full width instead of a lonely column beside six empty ones.
  const columns = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;
  const minWidth = days.length === 1 ? 0 : 820;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* The card is the scroll box for BOTH axes, capped to the viewport.
          It has to be: `overflow-x-auto` alone already makes an element a
          scroll container in CSS, so a day row trying to stick to the page
          got measured from the card's own top instead — it sat a header's
          height down inside the card, over the first rows of the day, with an
          empty band above it. Scrolling inside the card, the row sticks at
          top-0 and the hours at left-0, like any calendar. */}
      <div ref={scrollRef} className="max-h-[calc(100dvh-var(--app-header-h)-2rem)] overflow-auto scrollbar-slim rounded-2xl border border-border/70 bg-card shadow-card">
        <div style={{ minWidth }}>
          {/* Header row: day names. Opaque — the tint is layered over the
              card colour rather than being see-through — so appointments
              scrolling underneath stay hidden instead of showing blurred. */}
          <div
            style={{ gridTemplateColumns: columns }}
            className="sticky top-0 z-20 grid border-b border-border bg-card bg-gradient-to-b from-muted/50 to-muted/50"
          >
            {/* Corner. Sits above the gutter so neither scroll axis reveals a
                gap where the two sticky edges meet. */}
            <div className="sticky left-0 z-40 border-r border-border bg-card bg-gradient-to-b from-muted/50 to-muted/50" />
            {days.map((day) => {
              const past = isPastDay(day);
              const today = isToday(day);
              const count = (byDay.get(fmtDateKey(day)) ?? []).filter(
                (a) => effectiveStatus(a) !== "annule",
              ).length;
              return (
                <div
                  key={fmtDateKey(day)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 border-r border-border/70 py-2.5 last:border-r-0",
                    today && "bg-accent/50",
                    // Faded, not hidden: what was booked on Monday still has to
                    // be readable on Wednesday, it just cannot be added to.
                    past && !today && "bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "text-[0.65rem] font-semibold uppercase tracking-widest",
                      today ? "text-primary" : "text-muted-foreground/80",
                    )}
                  >
                    {format(day, "EEE", { locale: fr })}
                  </span>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-[0.95rem] font-semibold tnum transition-colors",
                      today
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : past
                          ? "text-muted-foreground/60"
                          : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span
                    className={cn(
                      "text-[10.5px] font-medium tnum",
                      count ? "text-primary" : "text-muted-foreground/50",
                    )}
                  >
                    {count ? `${count} rdv` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Body: time gutter + day columns */}
          <div className="grid" style={{ gridTemplateColumns: columns }}>
            {/* Time gutter. Sticky, so the hours stay readable while a week
                scrolls sideways on a narrow screen.

                Above the appointments (z-10) so none of them slide over the
                hours, below the day row (z-20) so the corner still wins where
                the two sticky edges cross — and below the console header,
                which it used to tie with and beat on document order alone. */}
            <div className="sticky left-0 z-[15] border-r border-border bg-card bg-gradient-to-b from-muted/40 to-muted/40">
              {slots.map((m, i) => (
                <div
                  key={m}
                  style={{ height: SLOT_PX }}
                  className="relative border-b border-transparent"
                >
                  {m % 30 === 0 ? (
                    <span
                      className={cn(
                        "absolute right-2.5 tabular-nums",
                        m % 60 === 0
                          ? "text-[0.78rem] font-semibold text-foreground/75"
                          : "text-[0.66rem] font-medium text-muted-foreground/60",
                        // Every hour label straddles its gridline. The first one
                        // has no row above it to straddle into: half of it would
                        // land outside the grid, where the scroll box and the
                        // sticky header between them swallow it. Sit it just
                        // under the top edge instead.
                        i === 0 ? "top-1" : "-top-2",
                      )}
                    >
                      {minutesToLabel(m)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const key = fmtDateKey(day);
              const positioned = layoutDay(byDay.get(key) ?? []);
              const closed = isPastDay(day);
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    "relative border-r border-border/70 last:border-r-0",
                    today && "bg-accent/20",
                    closed && !today && "bg-muted/25",
                  )}
                  style={{ height: GRID_HEIGHT }}
                >
                  {/* Droppable / clickable slot cells */}
                  {slots.map((m) => (
                    <SlotCell
                      key={m}
                      dateKey={key}
                      minute={m}
                      closed={closed}
                      onCreate={(_dk, minute) => onCreateSlot(day, minute)}
                    />
                  ))}

                  <AbsenceBands day={day} absences={absences} />

                  {isSameDay(day, now) ? <NowLine nowMin={nowMin} /> : null}

                  {/* Appointment blocks */}
                  {positioned.map((pos) => (
                    <AppointmentBlock
                      key={pos.appt.id}
                      pos={pos}
                      locked={closed}
                      onOpen={onOpenAppointment}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeAppt ? (
          <div
            className={cn(
              "relative w-56 overflow-hidden rounded-lg border py-1.5 pl-3.5 pr-2 text-left shadow-modal",
              statusMeta(effectiveStatus(activeAppt)).block,
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-[5px] rounded-l-lg",
                statusMeta(effectiveStatus(activeAppt)).bar,
              )}
            />
            <BlockContent appt={activeAppt} height={60} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * The part of each absence that falls inside this day's visible hours, as a
 * hatched band. Behind the appointments and transparent to the pointer: the
 * secretary can still book over an absence (an urgent case, a home visit), it
 * just can never be done without seeing it.
 */
function AbsenceBands({ day, absences }: { day: Date; absences: Absence[] }) {
  if (absences.length === 0) return null;
  const midnight = new Date(day);
  midnight.setHours(0, 0, 0, 0);
  const viewStart = midnight.getTime() + DAY_START_MIN * 60_000;
  const viewEnd = midnight.getTime() + DAY_END_MIN * 60_000;

  return (
    <>
      {absences.map((a) => {
        // The practice's wall-clock time, like the grid itself — right even
        // when this browser is set to another time zone.
        const start = Math.max(toPracticeLocalMs(Date.parse(a.starts_at)), viewStart);
        const end = Math.min(toPracticeLocalMs(Date.parse(a.ends_at)), viewEnd);
        if (!(end > start)) return null;
        const startMin = (start - midnight.getTime()) / 60_000;
        const endMin = (end - midnight.getTime()) / 60_000;
        return (
          <div
            key={a.id ?? a.starts_at}
            aria-hidden
            className="pointer-events-none absolute inset-x-0.5 z-[5] overflow-hidden rounded-md border border-amber-300/70 bg-[repeating-linear-gradient(45deg,rgb(254_243_199/0.75),rgb(254_243_199/0.75)_6px,rgb(255_251_235/0.6)_6px,rgb(255_251_235/0.6)_12px)]"
            style={{
              top: (startMin - DAY_START_MIN) * PX_PER_MIN,
              height: (endMin - startMin) * PX_PER_MIN,
            }}
          >
            <span className="absolute left-1.5 top-1 rounded bg-amber-100/90 px-1.5 py-px text-[10px] font-bold text-amber-800">
              Absent · {reasonLabel(a.reason)}
            </span>
          </div>
        );
      })}
    </>
  );
}

export { SLOT_MIN };
