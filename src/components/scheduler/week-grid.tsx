"use client";

import { useMemo } from "react";
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
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DAY_END_MIN,
  DAY_START_MIN,
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

/** Lay out a day's appointments into side-by-side lanes when they overlap. */
function layoutDay(appts: Appointment[]): Positioned[] {
  const items = appts
    .map((appt) => {
      const d = parseApptDate(appt.appointment_datetime);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const endMin = startMin + (appt.duration_minutes || 30);
      return { appt, startMin, endMin };
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
      const clampedEnd = Math.min(it.endMin, DAY_END_MIN);
      out.push({
        appt: it.appt,
        top: (clampedStart - DAY_START_MIN) * PX_PER_MIN,
        height: Math.max((clampedEnd - clampedStart) * PX_PER_MIN, 22),
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
  const d = parseApptDate(pos.appt.appointment_datetime);
  const widthPct = 100 / pos.lanes;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(pos.appt)}
      style={{
        top: pos.top,
        height: pos.height,
        left: `calc(${pos.lane * widthPct}% + 3px)`,
        width: `calc(${widthPct}% - 6px)`,
      }}
      className={cn(
        "group/appt absolute z-10 touch-none select-none overflow-hidden rounded-lg border py-1 pl-3 pr-2 text-left shadow-sm transition-all duration-150 ease-spring",
        locked
          ? "cursor-pointer"
          : "cursor-grab hover:-translate-y-px hover:shadow-card-hover active:cursor-grabbing",
        meta.block,
        (isDragging || dragging) && "opacity-40",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1 rounded-l-lg", meta.bar)} />
      <p className="truncate text-[11px] font-semibold leading-tight tnum">
        {format(d, "HH:mm")}
        <span className="mx-1 opacity-40">·</span>
        <span className="font-medium">{pos.appt.patient_name || "RDV"}</span>
      </p>
      {pos.height > 34 && pos.appt.notes ? (
        <p className="truncate text-[10px] font-medium opacity-70">
          {pos.appt.notes}
        </p>
      ) : null}
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
  const onHour = minute % 60 === 0;
  return (
    <div
      ref={setNodeRef}
      onClick={closed ? undefined : () => onCreate(dateKey, minute)}
      style={{ height: SLOT_PX }}
      className={cn(
        "group relative border-b transition-colors",
        // Hours anchor the eye; half-hours only need to be felt, so they are
        // drawn faint rather than dashed — dashes read as busy at this density.
        onHour ? "border-border/70" : "border-border/30",
        closed
          ? "cursor-not-allowed"
          : isOver
            ? "bg-primary/10 ring-2 ring-inset ring-primary/60"
            : "hover:bg-accent/50",
      )}
    >
      {closed ? null : (
        <Plus className="absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary opacity-0 transition-opacity group-hover:opacity-50" />
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
}: {
  days: Date[];
  appointments: Appointment[];
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
      <div className="overflow-x-auto scrollbar-slim rounded-2xl border border-border/70 bg-card shadow-card">
        <div style={{ minWidth }}>
          {/* Header row: day names */}
          <div
            style={{ gridTemplateColumns: columns }}
            className="sticky top-0 z-30 grid border-b border-border bg-muted/50 backdrop-blur-sm"
          >
            {/* Corner. Sits above the gutter so neither scroll axis reveals a
                gap where the two sticky edges meet. */}
            <div className="sticky left-0 z-40 border-r border-border bg-muted/50 backdrop-blur-sm" />
            {days.map((day) => {
              const past = isPastDay(day);
              const today = isToday(day);
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
                </div>
              );
            })}
          </div>

          {/* Body: time gutter + day columns */}
          <div className="grid" style={{ gridTemplateColumns: columns }}>
            {/* Time gutter. Sticky, so the hours stay readable while a week
                scrolls sideways on a narrow screen. */}
            <div className="sticky left-0 z-20 border-r border-border bg-muted/40">
              {slots.map((m, i) => (
                <div
                  key={m}
                  style={{ height: SLOT_PX }}
                  className="relative border-b border-transparent"
                >
                  {m % 60 === 0 ? (
                    <span
                      className={cn(
                        "absolute right-2.5 text-[0.7rem] font-medium tabular-nums text-muted-foreground/80",
                        // Every hour label straddles its gridline. The first one
                        // has no row above it to straddle into: half of it would
                        // land outside the grid, where the clipped container and
                        // the sticky header between them swallow it. Sit it just
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
              "relative overflow-hidden rounded-lg border py-1 pl-3 pr-2 text-left shadow-modal",
              statusMeta(effectiveStatus(activeAppt)).block,
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-1 rounded-l-lg",
                statusMeta(effectiveStatus(activeAppt)).bar,
              )}
            />
            <p className="text-[11px] font-semibold leading-tight tnum">
              {format(parseApptDate(activeAppt.appointment_datetime), "HH:mm")}
              <span className="mx-1 opacity-40">·</span>
              <span className="font-medium">
                {activeAppt.patient_name || "RDV"}
              </span>
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { SLOT_MIN };
