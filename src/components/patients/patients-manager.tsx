"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronRight,
  Loader2,
  Pencil,
  Phone,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, searchPatients } from "@/lib/client-api";
import { useDebounced } from "@/components/scheduler/patient-picker";
import { avatarColor, initials } from "@/lib/avatar";
import { cn, dossierLabel } from "@/lib/utils";
import type { SafePatient } from "@/types";
import { PatientDetailsDialog } from "./patient-details-dialog";
import { PatientFormDialog } from "./patient-form-dialog";

export function PatientsManager({
  initialPatients = null,
}: {
  /** The empty-search list as the server already fetched it. */
  initialPatients?: SafePatient[] | null;
}) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SafePatient | null>(null);
  const [viewing, setViewing] = useState<SafePatient | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    data: patients = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    // An empty search returns the whole list, newest first.
    queryKey: ["patients-list", debounced],
    queryFn: () => searchPatients(debounced),
    staleTime: 10_000,
    // Seeds only the unfiltered list; any search term fetches.
    initialData: debounced === "" && initialPatients ? initialPatients : undefined,
  });

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">
              Patients
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground tnum">
              {isLoading
                ? "Chargement…"
                : `${patients.length} ${patients.length > 1 ? "patients" : "patient"}`}
            </p>
          </div>

          <Button size="lg" className="gap-2" onClick={openNew}>
            <UserPlus className="h-[1.1rem] w-[1.1rem]" /> Nouveau patient
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Rechercher par nom, téléphone, n° de dossier…"
            className="h-12 pl-11 pr-11"
          />
          {isFetching ? (
            <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

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

      {isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </li>
          ))}
        </ul>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Users className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            {debounced.trim() ? "Aucun patient trouvé" : "Aucun patient"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {debounced.trim()
              ? `Rien ne correspond à « ${debounced.trim()} ».`
              : "Ajoutez le premier patient."}
          </p>
          {debounced.trim() ? (
            <Button variant="outline" className="mt-5" onClick={() => setTerm("")}>
              Effacer la recherche
            </Button>
          ) : (
            <Button className="mt-5 gap-2" onClick={openNew}>
              <UserPlus className="h-4 w-4" /> Nouveau patient
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((p, i) => (
            <PatientCard
              key={p.id}
              patient={p}
              index={i}
              onOpen={() => {
                setViewing(p);
                setDetailsOpen(true);
              }}
              onEdit={() => {
                setEditing(p);
                setFormOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <PatientDetailsDialog
        patient={viewing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(p) => {
          setDetailsOpen(false);
          setEditing(p);
          setFormOpen(true);
        }}
      />

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["patients-list"] });
          setViewing(null);
        }}
      />
    </div>
  );
}

/**
 * One patient. The whole card opens the record; "Modifier" goes straight to
 * the form. A div with a button role rather than a <button>, because a button
 * may not contain another button.
 */
function PatientCard({
  patient: p,
  index,
  onOpen,
  onEdit,
}: {
  patient: SafePatient;
  index: number;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const name = p.display_name || `${p.first_name} ${p.last_name}`.trim() || "—";
  const dossier = dossierLabel(p);

  return (
    <li style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }} className="animate-slide-up">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Voir la fiche de ${name}`}
        className="group flex h-full cursor-pointer flex-col rounded-2xl border bg-card shadow-card transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <div className="flex items-start gap-3.5 p-4 pb-3">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[0.95rem] font-semibold",
              avatarColor(p.id),
            )}
          >
            {initials(p.first_name, p.last_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.98rem] font-semibold text-foreground">{name}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.gender === "M" || p.gender === "F" ? <Tag>{p.gender === "M" ? "Homme" : "Femme"}</Tag> : null}
              {p.age != null ? <Tag>{p.age} ans</Tag> : null}
              {dossier ? <Tag tone="primary">{dossier}</Tag> : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Modifier ${name}`}
            title="Modifier"
            className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <dl className="grid flex-1 gap-1.5 px-4 pb-3 text-sm text-muted-foreground">
          <Row icon={Phone} className="tnum" empty="Pas de téléphone">
            {p.phone}
          </Row>
          <Row icon={Briefcase} empty="Profession non renseignée">
            {p.job}
          </Row>
          <Row icon={ShieldCheck} empty="Assurance non renseignée">
            {p.insurance_type}
          </Row>
        </dl>

        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-primary">
          Voir la fiche
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </div>
    </li>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "primary" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold tnum",
        tone === "primary" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Row({
  icon: Icon,
  className,
  empty,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  /** Shown faded when the value is missing, so every card has the same rows. */
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      {children ? (
        <span className={cn("truncate text-foreground/80", className)}>{children}</span>
      ) : (
        <span className="truncate text-muted-foreground/50">{empty}</span>
      )}
    </div>
  );
}
