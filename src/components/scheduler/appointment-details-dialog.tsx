"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  Clock,
  Loader2,
  Lock,
  Pencil,
  StickyNote,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  deleteAppointment,
  setAppointmentStatus,
  updateAppointment,
} from "@/lib/client-api";
import {
  DURATION_OPTIONS,
  effectiveStatus,
  isPastDay,
  parseApptDate,
  statusMeta,
  todayKey,
} from "@/lib/scheduler";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types";

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onChanged,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit-form fields
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  // Reset to view mode and refill the form whenever a new appointment opens.
  useEffect(() => {
    if (open && appointment) {
      const d = parseApptDate(appointment.appointment_datetime);
      setEditing(false);
      setDateStr(format(d, "yyyy-MM-dd"));
      setTimeStr(format(d, "HH:mm"));
      setDuration(appointment.duration_minutes || 30);
      setNotes(appointment.notes ?? "");
    }
  }, [open, appointment]);

  if (!appointment) return null;

  const start = parseApptDate(appointment.appointment_datetime);

  // What it reads as, which for an untouched appointment whose time has gone is
  // "Passé" even though `a_venir` is what is stored.
  const meta = statusMeta(effectiveStatus(appointment));

  // A day that has gone is history: it can be read, not rewritten.
  const locked = isPastDay(start);

  async function changeStatus(status: AppointmentStatus) {
    setBusy(true);
    try {
      await setAppointmentStatus(appointment!.id, status);
      toast.success("Statut mis à jour.");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la mise à jour.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!dateStr || !timeStr) {
      toast.error("Date et heure obligatoires.");
      return;
    }
    const next = `${dateStr} ${timeStr}:00`;
    // Leaving a past appointment where it is must keep working, so only a
    // genuine change of slot is measured against today.
    if (next !== appointment!.appointment_datetime && dateStr < todayKey()) {
      toast.error("Impossible de déplacer un rendez-vous vers une date passée.");
      return;
    }
    setBusy(true);
    try {
      await updateAppointment(appointment!.id, {
        appointment_datetime: next,
        duration_minutes: duration,
        status: appointment!.status,
        notes: notes.trim() || null,
      });
      toast.success("Rendez-vous modifié.");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la modification.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement ce rendez-vous ?")) return;
    setBusy(true);
    try {
      await deleteAppointment(appointment!.id);
      toast.success("Rendez-vous supprimé.");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-primary" />
            {appointment.patient_name || "Patient"}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          /* ── Edit mode ───────────────────────────────────────────── */
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateStr}
                  min={todayKey()}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  step={300}
                  className="h-11 text-base"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Durée</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => setDuration(Number(v))}
              >
                <SelectTrigger className="tnum">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)} className="tnum">
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Note</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Motif, remarque…"
                className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] shadow-inner-sm transition-all duration-150 placeholder:text-muted-foreground/70 hover:border-border/60 focus-visible:border-primary focus-visible:shadow-glow focus-visible:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Retour
              </Button>
              <Button size="lg" className="flex-1" disabled={busy} onClick={saveEdit}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          /* ── View mode ───────────────────────────────────────────── */
          <div className="space-y-3 pt-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                meta.badge,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} /> {meta.label}
            </span>

            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="flex items-center gap-2 capitalize">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {format(start, "EEEE d MMMM yyyy", { locale: fr })}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {format(start, "HH:mm")} · {appointment.duration_minutes} min
              </p>
              {appointment.notes ? (
                <p className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  {appointment.notes}
                </p>
              ) : null}
            </div>

            {locked ? (
              <p className="flex items-start gap-2 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                Ce rendez-vous est passé : il ne peut plus être modifié.
              </p>
            ) : (
              <>
                {/* Edit button */}
                <Button
                  variant="outline"
                  className="w-full gap-2 h-11 border-primary/30 text-primary hover:bg-accent"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4" /> Modifier le rendez-vous
                </Button>

                {/* Status actions. "Passé" is not among them: it is what an
                    untouched appointment becomes on its own once the time has
                    gone, so offering it as a button would only let her set by
                    hand something that is already true. */}
                <div className="grid grid-cols-2 gap-2">
                  {appointment.status !== "approuve" && (
                    <Button
                      variant="outline"
                      className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      disabled={busy}
                      onClick={() => changeStatus("approuve")}
                    >
                      <Check className="h-4 w-4" /> Confirmer
                    </Button>
                  )}
                  {appointment.status !== "annule" && (
                    <Button
                      variant="outline"
                      className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                      disabled={busy}
                      onClick={() => changeStatus("annule")}
                    >
                      <XCircle className="h-4 w-4" /> Annuler le RDV
                    </Button>
                  )}
                  {appointment.status !== "a_venir" && (
                    <Button
                      variant="outline"
                      className="gap-2 border-sky-200 text-sky-700 hover:bg-sky-50"
                      disabled={busy}
                      onClick={() => changeStatus("a_venir")}
                    >
                      <Clock className="h-4 w-4" /> Rétablir « à venir »
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="w-full gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Supprimer
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
