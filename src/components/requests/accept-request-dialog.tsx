"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  Check,
  Loader2,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, acceptRequest, searchPatients } from "@/lib/client-api";
import { DURATION_OPTIONS, minutesToLabel } from "@/lib/scheduler";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { AppointmentRequest } from "@/types";

/** "new" means: none of the matches is this person, create a patient. */
const NEW_PATIENT = "new";

function timeOptions(): number[] {
  const out: number[] = [];
  for (let m = 8 * 60; m < 19 * 60; m += 15) out.push(m);
  return out;
}

export function AcceptRequestDialog({
  request,
  open,
  onOpenChange,
  onAccepted,
}: {
  request: AppointmentRequest | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccepted: () => void;
}) {
  const [choice, setChoice] = useState<string>(NEW_PATIENT);
  const [date, setDate] = useState("");
  const [minute, setMinute] = useState(9 * 60);
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  // Look the submitter up in doctor.db. A numéro de dossier is a far stronger
  // key than a phone number, which families share — so prefer it when the
  // visitor said they are already a patient.
  const lookup = request?.is_existing_patient && request.numero_dossier
    ? request.numero_dossier
    : (request?.phone ?? "");

  const { data: matches = [], isLoading: matching } = useQuery({
    queryKey: ["request-match", lookup],
    queryFn: () => searchPatients(lookup),
    enabled: open && !!lookup,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!open || !request) return;
    setChoice(NEW_PATIENT);
    setDuration(30);

    const preferred = request.preferred_at ? new Date(request.preferred_at) : null;
    setDate(format(preferred ?? new Date(), "yyyy-MM-dd"));

    // A slot picked off the public grid carries a real time; a loose "jour
    // souhaité" is stored at midnight, so fall back to the period instead.
    const exact =
      preferred && (preferred.getHours() !== 0 || preferred.getMinutes() !== 0);
    setMinute(
      exact
        ? preferred!.getHours() * 60 + preferred!.getMinutes()
        : request.preferred_period === "apres_midi"
          ? 14 * 60
          : 9 * 60,
    );
  }, [open, request]);

  /**
   * The visitor's dossier was confirmed against doctor.db, and we found that
   * record: the patient is known, so there is nothing to choose and "create a
   * new patient" would only produce a duplicate.
   */
  const locked =
    request?.is_existing_patient === true &&
    request?.dossier_verified === true &&
    matches.length > 0;

  // Default to the obvious match rather than making them pick it.
  useEffect(() => {
    if (matches.length >= 1) setChoice(String(matches[0].id));
  }, [matches]);

  if (!request) return null;

  const submittedName =
    `${request.first_name} ${request.last_name}`.trim() || request.last_name;

  async function submit() {
    if (!date) {
      toast.error("Choisissez une date.");
      return;
    }
    setSaving(true);
    try {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      await acceptRequest(request!.id, {
        patient_id: choice === NEW_PATIENT ? null : choice,
        appointment_datetime: `${date} ${hh}:${mm}:00`,
        duration_minutes: duration,
      });
      toast.success("Rendez-vous créé. Pensez à rappeler le patient.");
      onAccepted();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Impossible d'accepter la demande.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto scrollbar-slim sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">
            Accepter la demande
          </DialogTitle>
          <DialogDescription>
            {submittedName} · {request.phone}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Patient</Label>

            {matching ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche d&apos;un patient existant…
              </p>
            ) : (
              <div className="space-y-2">
                {/* A verified dossier already identifies the record, so there
                    is nothing to choose and creating a duplicate would be a
                    mistake — the option is hidden below. */}
                {locked ? (
                  <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Dossier N° {request.numero_dossier} vérifié : patient déjà
                      enregistré.
                    </span>
                  </p>
                ) : null}

                {matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setChoice(String(p.id))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      choice === String(p.id)
                        ? "border-primary bg-accent"
                        : "hover:bg-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                        avatarColor(p.id),
                      )}
                    >
                      {initials(p.first_name, p.last_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {p.display_name || `${p.first_name} ${p.last_name}`.trim()}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tnum">
                        {[p.phone, p.numero_dossier ? `N° ${p.numero_dossier}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {choice === String(p.id) ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                ))}

                {locked ? null : (
                  <button
                    type="button"
                    onClick={() => setChoice(NEW_PATIENT)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      choice === NEW_PATIENT
                        ? "border-primary bg-accent"
                        : "hover:bg-secondary",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        Créer un nouveau patient
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {submittedName} · {request.phone}
                      </span>
                    </span>
                    {choice === NEW_PATIENT ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                )}

                {/* Said they were a returning patient, but nothing matched —
                    worth flagging rather than silently creating a duplicate. */}
                {request.is_existing_patient && !locked ? (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Le patient se déclare déjà suivi
                    {request.numero_dossier ? ` (N° ${request.numero_dossier})` : ""},
                    mais aucun dossier ne correspond. Vérifiez avant de créer une
                    fiche.
                  </p>
                ) : null}

                {matches.length === 0 && !request.is_existing_patient ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Aucun patient existant avec ce numéro.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="tnum"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Heure</Label>
              <Select value={String(minute)} onValueChange={(v) => setMinute(Number(v))}>
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

          <p className="flex items-start gap-2 rounded-xl bg-secondary px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Le patient n&apos;est pas prévenu automatiquement : rappelez-le au{" "}
            <span className="font-medium text-foreground">{request.phone}</span>{" "}
            pour confirmer.
          </p>

          <div className="flex gap-3">
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Créer le rendez-vous
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
