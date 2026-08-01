"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, createAppointment } from "@/lib/client-api";
import {
  buildApptDatetime,
  DAY_END_MIN,
  DAY_START_MIN,
  DURATION_OPTIONS,
  minutesToLabel,
  SLOT_MIN,
} from "@/lib/scheduler";
import type { SafePatient } from "@/types";
import { PatientPicker } from "./patient-picker";

export type SlotTarget = { day: Date; minute: number };

function timeOptions(): number[] {
  const out: number[] = [];
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += SLOT_MIN) out.push(m);
  return out;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  target,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: SlotTarget | null;
  onCreated: () => void;
}) {
  const [patient, setPatient] = useState<SafePatient | null>(null);
  const [minute, setMinute] = useState(target?.minute ?? 9 * 60);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset the form whenever a new slot/dialog opens.
  useEffect(() => {
    if (open) {
      setPatient(null);
      setMinute(target?.minute ?? 9 * 60);
      setDuration(30);
      setNotes("");
      setCreating(false);
    }
  }, [open, target]);

  const day = target?.day ?? new Date();

  async function submit() {
    if (!patient) {
      toast.error("Choisissez d'abord un patient.");
      return;
    }
    setSaving(true);
    try {
      await createAppointment({
        patient_id: patient.id,
        appointment_datetime: buildApptDatetime(day, minute),
        duration_minutes: duration,
        notes: notes.trim() || null,
        status: "a_venir",
      });
      toast.success("Rendez-vous enregistré.");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-slim sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">
            Nouveau rendez-vous
          </DialogTitle>
          <DialogDescription asChild>
            <span className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-sm font-medium capitalize text-accent-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {format(day, "EEEE d MMMM", { locale: fr })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-sm font-medium text-foreground tnum">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {minutesToLabel(minute)}
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {creating ? "Nouveau patient" : "Patient"}
            </Label>
            <PatientPicker
              value={patient}
              onChange={setPatient}
              onCreatingChange={setCreating}
            />
          </div>

          {creating ? null : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Heure</Label>
              <Select
                value={String(minute)}
                onValueChange={(v) => setMinute(Number(v))}
              >
                <SelectTrigger className="tnum">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions().map((m) => (
                    <SelectItem key={m} value={String(m)} className="tnum">
                      {minutesToLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          )}

          {creating ? null : (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Note (facultatif)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Motif, remarque…"
              className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] shadow-inner-sm transition-all duration-150 placeholder:text-muted-foreground/70 hover:border-border/60 focus-visible:border-primary focus-visible:shadow-glow focus-visible:outline-none"
            />
          </div>
          )}

          {creating ? null : (
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={submit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
