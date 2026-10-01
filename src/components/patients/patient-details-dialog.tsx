"use client";

import { useQuery } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  Hash,
  History,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fetchWeek } from "@/lib/client-api";
import { avatarColor, initials } from "@/lib/avatar";
import { effectiveStatus, fmtDateKey, parseApptDate, statusMeta } from "@/lib/scheduler";
import { cn, dossierLabel } from "@/lib/utils";
import type { Appointment, SafePatient } from "@/types";

/**
 * A patient's record as the secretary may see it: identity, contact,
 * administrative details and their appointments — never the medical content,
 * which stays in the doctor's app.
 */

function formatDob(dob: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob || null;
  const d = new Date(`${dob}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dob : format(d, "d MMMM yyyy", { locale: fr });
}

export function PatientDetailsDialog({
  patient,
  open,
  onOpenChange,
  onEdit,
}: {
  patient: SafePatient | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (p: SafePatient) => void;
}) {
  // Six months back, six ahead: what a front desk asks about ("when did she
  // last come?", "is he booked?") without loading years of history.
  const from = fmtDateKey(addMonths(new Date(), -6));
  const to = fmtDateKey(addMonths(new Date(), 6));

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ["week", from, to],
    queryFn: () => fetchWeek(from, to),
    enabled: open && patient !== null,
    staleTime: 30_000,
  });

  if (!patient) return null;

  const name = patient.display_name || `${patient.first_name} ${patient.last_name}`.trim() || "—";
  const mine = appointments
    .filter((a) => a.patient_id === patient.id)
    .sort((x, y) => x.appointment_datetime.localeCompare(y.appointment_datetime));
  const now = Date.now();
  const upcoming = mine.filter((a) => parseApptDate(a.appointment_datetime).getTime() >= now);
  const past = mine.filter((a) => parseApptDate(a.appointment_datetime).getTime() < now).reverse();
  const dossier = dossierLabel(patient);
  const dob = formatDob(patient.date_of_birth);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 scrollbar-slim sm:max-w-2xl">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b bg-mesh px-6 pb-5 pt-6">
          <div className="flex items-start gap-4 pr-8">
            <span
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold",
                avatarColor(patient.id),
              )}
            >
              {initials(patient.first_name, patient.last_name)}
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-xl tracking-tight">{name}</DialogTitle>
              <DialogDescription asChild>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {patient.gender === "M" || patient.gender === "F" ? (
                    <Chip>{patient.gender === "M" ? "Homme" : "Femme"}</Chip>
                  ) : null}
                  {patient.age != null ? <Chip>{patient.age} ans</Chip> : null}
                  {dossier ? <Chip tone="primary">{dossier}</Chip> : null}
                  {patient.insurance_type ? <Chip>{patient.insurance_type}</Chip> : null}
                </div>
              </DialogDescription>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {patient.phone ? (
              <Button asChild size="sm" className="gap-2">
                <a href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="h-4 w-4" /> Appeler
                </a>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onEdit(patient)}>
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
          {/* ── Coordonnées ─────────────────────────────────────── */}
          <Panel icon={Phone} title="Coordonnées">
            <Info icon={Phone} label="Téléphone" value={patient.phone} mono />
            <Info icon={Mail} label="Email" value={patient.email} />
            <Info icon={MapPin} label="Adresse" value={patient.address} />
          </Panel>

          {/* ── Identité ────────────────────────────────────────── */}
          <Panel icon={UserRound} title="Identité">
            <Info
              icon={CalendarDays}
              label="Date de naissance"
              value={dob ? `${dob}${patient.age != null ? ` · ${patient.age} ans` : ""}` : ""}
            />
            <Info icon={Users} label="Nom du père" value={patient.father_name} />
            <Info icon={Briefcase} label="Profession" value={patient.job} />
          </Panel>

          <Panel icon={ShieldCheck} title="Administratif" className="sm:col-span-2">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <Info icon={Hash} label="N° de dossier" value={patient.numero_dossier || (patient.registered ? "" : "En attente du médecin")} mono />
              <Info icon={ShieldCheck} label="Assurance" value={patient.insurance_type} />
            </div>
          </Panel>

          {/* ── Rendez-vous ─────────────────────────────────────── */}
          <Panel icon={CalendarClock} title="Rendez-vous" className="sm:col-span-2">
            {isLoading ? (
              <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </p>
            ) : isError ? (
              <p className="py-2 text-sm text-muted-foreground">
                Rendez-vous indisponibles pour le moment.
              </p>
            ) : mine.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                Aucun rendez-vous sur les six derniers et six prochains mois.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {upcoming.length > 0 ? (
                  <ApptList title="À venir" icon={CalendarClock} items={upcoming} />
                ) : null}
                {past.length > 0 ? (
                  <ApptList title="Passés" icon={History} items={past.slice(0, 5)} muted />
                ) : null}
              </div>
            )}
          </Panel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApptList({
  title,
  icon: Icon,
  items,
  muted,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Appointment[];
  muted?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((a) => {
          const when = parseApptDate(a.appointment_datetime);
          const meta = statusMeta(effectiveStatus(a));
          return (
            <li
              key={a.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2.5",
                muted && "opacity-75",
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
              <span className="flex-1 text-sm font-medium capitalize text-foreground">
                {format(when, "EEEE d MMMM yyyy · HH:mm", { locale: fr })}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badge)}>
                {meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-4", className)}>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("break-words text-sm font-medium text-foreground", mono && "tnum", !value && "font-normal text-muted-foreground/60")}>
          {value || "Non renseigné"}
        </p>
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold tnum",
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}
