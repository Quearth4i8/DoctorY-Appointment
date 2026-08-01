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
  fmtDateKey,
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
  onOpen,
  dragging,
}: {
  pos: Positioned;
  onOpen: (a: Appointment) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(pos.appt.id),
    data: { appt: pos.appt },
  });
  const meta = statusMeta(pos.appt.status);
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
        left: `calc(${pos.lane * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={cn(
        "absolute z-10 cursor-grab touch-none select-none overflow-hidden rounded-lg border py-1 pl-3 pr-2 text-left shadow-sm transition-colors active:cursor-grabbing",
        meta.block,
        (isDragging || dragging) && "opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1.5 rounded-l-lg",
          meta.bar,
        )}
      />
      <p className="truncate text-[11px] font-semibold leading-tight">
        {format(d, "HH:mm")} · {pos.appt.patient_name || "RDV"}
      </p>
      {pos.height > 34 && pos.appt.notes ? (
        <p className="truncate text-[10px] font-medium opacity-80">
          {pos.appt.notes}
        </p>
      ) : null}
    </div>
  );
}

function SlotCell({
  dateKey,
  minute,
  onCreate,
}: {
  dateKey: string;
  minute: number;
  onCreate: (dateKey: string, minute: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${dateKey}|${minute}` });
  const onHour = minute % 60 === 0;
  return (
    <div
      ref={setNodeRef}
      onClick={() => onCreate(dateKey, minute)}
      style={{ height: SLOT_PX }}
      className={cn(
        "group relative border-b border-border/60",
        onHour ? "border-border" : "border-dashed",
        isOver ? "bg-primary/15 ring-2 ring-inset ring-primary" : "hover:bg-accent/40",
      )}
    >
      <Plus className="absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-primary opacity-0 transition-opacity group-hover:opacity-60" />
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
  activeId: number | null;
  setActiveId: (id: number | null) => void;
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
    setActiveId(Number(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const appt = appointments.find((a) => a.id === Number(active.id));
    if (!appt) return;
    const [dateKey, minStr] = String(over.id).split("|");
    const minute = Number(minStr);
    const day = days.find((d) => fmtDateKey(d) === dateKey);
    if (!day) return;
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto scrollbar-slim rounded-2xl border border-border bg-card shadow-sm">
        <div className="min-w-[820px]">
          {/* Header row: day names */}
          <div className="sticky top-0 z-20 grid grid-cols-[64px_repeat(7,1fr)] border-b border-border bg-card/95 backdrop-blur">
            <div className="border-r border-border" />
            {days.map((day) => (
              <div
                key={fmtDateKey(day)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 border-r border-border py-2",
                  isToday(day) && "bg-accent/50",
                )}
              >
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {format(day, "EEE", { locale: fr })}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                    isToday(day)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}
          </div>

          {/* Body: time gutter + day columns */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)]">
            {/* Time gutter */}
            <div className="border-r border-border">
              {slots.map((m) => (
                <div
                  key={m}
                  style={{ height: SLOT_PX }}
                  className="relative border-b border-transparent"
                >
                  {m % 60 === 0 ? (
                    <span className="absolute -top-2 right-2 text-[11px] tabular-nums text-muted-foreground">
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
              return (
                <div
                  key={key}
                  className={cn(
                    "relative border-r border-border",
                    isToday(day) && "bg-accent/20",
                  )}
                  style={{ height: GRID_HEIGHT }}
                >
                  {/* Droppable / clickable slot cells */}
                  {slots.map((m) => (
                    <SlotCell
                      key={m}
                      dateKey={key}
                      minute={m}
                      onCreate={(_dk, minute) => onCreateSlot(day, minute)}
                    />
                  ))}

                  {/* Appointment blocks */}
                  {positioned.map((pos) => (
                    <AppointmentBlock
                      key={pos.appt.id}
                      pos={pos}
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
              "relative overflow-hidden rounded-lg border py-1 pl-3 pr-2 text-left shadow-xl",
              statusMeta(activeAppt.status).block,
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-1.5 rounded-l-lg",
                statusMeta(activeAppt.status).bar,
              )}
            />
            <p className="text-[11px] font-semibold leading-tight">
              {format(parseApptDate(activeAppt.appointment_datetime), "HH:mm")} ·{" "}
              {activeAppt.patient_name || "RDV"}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { SLOT_MIN };
