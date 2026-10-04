"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  CalendarRange,
  Check,
  Clock,
  Info,
  Loader2,
  Plane,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import {
  ABSENCE_REASONS,
  formatAbsenceRange,
  reasonLabel,
  returnDate,
  type Absence,
  type AbsenceReason,
} from "@/lib/absences";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Where the secretary tells patients the doctor is away.
 *
 * Saving an absence immediately closes those slots on the public agenda and
 * puts a notice on the profile — the form says so, because that consequence
 * is the whole point and should never be a surprise.
 */

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysKey(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AbsencesManager({
  doctorId,
  absences,
  loadError,
}: {
  doctorId: string | null;
  absences: Absence[];
  loadError: boolean;
}) {
  const now = Date.now();
  const current = absences.filter(
    (a) => Date.parse(a.starts_at) <= now && Date.parse(a.ends_at) > now,
  );
  const upcoming = absences.filter((a) => Date.parse(a.starts_at) > now);
  const past = absences.filter((a) => Date.parse(a.ends_at) <= now).reverse();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
          Absences du médecin
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Congés, conférences, formations, réunions : pendant une absence, les
          patients ne peuvent plus demander de rendez-vous sur ces créneaux et
          voient un message sur la fiche du cabinet.
        </p>
      </header>

      {!doctorId ? (
        <Notice tone="error">
          Aucun cabinet n&apos;est rattaché à ce compte : impossible d&apos;enregistrer une absence.
        </Notice>
      ) : (
        <AbsenceForm doctorId={doctorId} />
      )}

      {loadError ? (
        <Notice tone="error">
          Impossible de charger les absences. Si le problème persiste, la mise à jour de la base
          n&apos;est peut-être pas encore appliquée.
        </Notice>
      ) : null}

      <AbsenceList
        title="En cours"
        empty={null}
        absences={current}
        highlight
      />
      <AbsenceList
        title="À venir"
        empty="Aucune absence prévue. Le cabinet est ouvert selon ses horaires habituels."
        absences={upcoming}
      />
      {past.length > 0 ? <AbsenceList title="Passées (30 derniers jours)" empty={null} absences={past} muted /> : null}
    </div>
  );
}

function AbsenceForm({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [allDay, setAllDay] = useState(true);
  const [fromDay, setFromDay] = useState(todayKey);
  const [toDay, setToDay] = useState(todayKey);
  const [day, setDay] = useState(todayKey);
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("12:00");
  const [reason, setReason] = useState<AbsenceReason>("conge");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Instants in the secretary's own clock — she is in the practice's timezone.
  const startsAt = allDay ? new Date(`${fromDay}T00:00:00`) : new Date(`${day}T${fromTime}:00`);
  const endsAt = allDay ? new Date(`${addDaysKey(toDay, 1)}T00:00:00`) : new Date(`${day}T${toTime}:00`);
  const valid =
    !Number.isNaN(startsAt.getTime()) &&
    !Number.isNaN(endsAt.getTime()) &&
    endsAt > startsAt &&
    endsAt.getTime() > Date.now();

  const preview = valid
    ? formatAbsenceRange({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
    : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("doctor_absences").insert({
      doctor_id: doctorId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason,
      note: note.trim(),
      created_by: userData.user?.id ?? null,
    });
    setSaving(false);

    if (error) {
      toast.error(
        error.message.includes("doctor_absences")
          ? "Enregistrement impossible : la mise à jour de la base n'est pas encore appliquée."
          : `Enregistrement impossible : ${error.message}`,
      );
      return;
    }
    toast.success("Absence enregistrée. Les créneaux concernés sont fermés aux patients.");
    setNote("");
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-card lg:p-7"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Plus className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">Nouvelle absence</h2>
          <p className="text-sm text-muted-foreground">Une journée, plusieurs jours, ou quelques heures.</p>
        </div>
      </div>

      {/* Durée */}
      <div className="flex w-fit items-center rounded-xl border border-border/70 bg-secondary/40 p-1">
        {[
          { v: true, label: "Journées entières", icon: CalendarRange },
          { v: false, label: "Quelques heures", icon: Clock },
        ].map(({ v, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => setAllDay(v)}
            aria-pressed={allDay === v}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              allDay === v ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {allDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="abs-from" label="Du">
            <DatePicker
              id="abs-from"
              value={fromDay}
              min={todayKey()}
              onChange={(v) => {
                setFromDay(v);
                if (v > toDay) setToDay(v);
              }}
            />
          </Field>
          <Field id="abs-to" label="Au (inclus)">
            <DatePicker id="abs-to" value={toDay} min={fromDay} onChange={setToDay} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="abs-day" label="Le">
            <DatePicker id="abs-day" value={day} min={todayKey()} onChange={setDay} />
          </Field>
          <Field id="abs-start" label="De">
            <TimePicker id="abs-start" value={fromTime} onChange={setFromTime} />
          </Field>
          <Field id="abs-end" label="À">
            <TimePicker id="abs-end" value={toTime} onChange={setToTime} />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="abs-reason" label="Motif affiché aux patients">
          <Select value={reason} onValueChange={(v) => setReason(v as AbsenceReason)}>
            <SelectTrigger id="abs-reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ABSENCE_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="abs-note" label="Message aux patients (facultatif)">
          <Input
            id="abs-note"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. Reprise des consultations le lundi 21"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          {preview ? (
            <span>
              Absent <strong className="text-foreground">{preview}</strong> — les patients ne pourront
              pas réserver.
            </span>
          ) : (
            <span className="text-destructive">Vérifiez les dates : la fin doit être après le début, et dans le futur.</span>
          )}
        </p>
        <Button type="submit" disabled={!valid || saving} className="min-w-44">
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          Enregistrer l&apos;absence
        </Button>
      </div>
    </form>
  );
}

function AbsenceList({
  title,
  absences,
  empty,
  highlight,
  muted,
}: {
  title: string;
  absences: Absence[];
  empty: string | null;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (absences.length === 0 && !empty) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {absences.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-sm text-muted-foreground">
          <CalendarOff className="h-5 w-5" />
          {empty}
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {absences.map((a) => (
            <AbsenceRow key={a.id} absence={a} highlight={highlight} muted={muted} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AbsenceRow({
  absence,
  highlight,
  muted,
}: {
  absence: Absence;
  highlight?: boolean;
  muted?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const back = returnDate(absence);

  async function remove() {
    if (!absence.id) return;
    const ok = await confirm({
      title: "Supprimer cette absence ?",
      description: "Les créneaux concernés redeviendront réservables par les patients.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    const { error } = await createClient().from("doctor_absences").delete().eq("id", absence.id);
    setDeleting(false);
    if (error) {
      toast.error(`Suppression impossible : ${error.message}`);
      return;
    }
    toast.success("Absence supprimée.");
    router.refresh();
  }

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-2xl border bg-card px-5 py-4 shadow-card",
        highlight && "border-warn/40 bg-warn-soft/40",
        muted && "[&>span]:opacity-60 [&>div]:opacity-70",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          highlight ? "bg-warn/15 text-warn-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Plane className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {reasonLabel(absence.reason)}{" "}
          <span className="font-normal text-muted-foreground">· {formatAbsenceRange(absence)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {absence.note ? `« ${absence.note} »` : back ? `Reprise le ${back}` : "Aucun message aux patients"}
        </p>
      </div>
      {/* Past ones too: an absence entered by mistake should not linger in
          the history. */}
      <Button variant="ghost" size="sm" onClick={remove} disabled={deleting} className="text-destructive hover:text-destructive">
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Supprimer
      </Button>
    </li>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      {children}
    </div>
  );
}
