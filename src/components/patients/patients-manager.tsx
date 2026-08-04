"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Loader2,
  Mail,
  MapPin,
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
import { PatientFormDialog } from "./patient-form-dialog";

export function PatientsManager() {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SafePatient | null>(null);

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
          {patients.map((p, i) => {
            const name = p.display_name || `${p.first_name} ${p.last_name}`.trim();
            const meta = [
              p.gender === "M" || p.gender === "F" ? p.gender : "",
              p.age != null ? `${p.age} ans` : "",
              dossierLabel(p),
            ].filter(Boolean);

            return (
              <li
                key={p.id}
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                className="group animate-slide-up rounded-2xl border bg-card p-4 shadow-card transition-all duration-200 hover:border-primary/25 hover:shadow-card-hover"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                      avatarColor(p.id),
                    )}
                  >
                    {initials(p.first_name, p.last_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {name || "—"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground tnum">
                      {meta.join(" · ") || "—"}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Modifier ${name}`}
                    className="shrink-0 gap-1.5 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                    onClick={() => {
                      setEditing(p);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </Button>
                </div>

                {p.phone || p.email || p.job || p.insurance_type || p.address ? (
                  <dl className="mt-3.5 grid gap-1.5 border-t pt-3.5 text-sm text-muted-foreground">
                    {p.phone ? (
                      <Row icon={Phone} className="tnum">
                        {p.phone}
                      </Row>
                    ) : null}
                    {p.email ? <Row icon={Mail}>{p.email}</Row> : null}
                    {p.job ? <Row icon={Briefcase}>{p.job}</Row> : null}
                    {p.insurance_type ? (
                      <Row icon={ShieldCheck}>{p.insurance_type}</Row>
                    ) : null}
                    {p.address ? <Row icon={MapPin}>{p.address}</Row> : null}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["patients-list"] })}
      />
    </div>
  );
}

function Row({
  icon: Icon,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className={cn("truncate", className)}>{children}</span>
    </div>
  );
}
