"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, dossierLabel } from "@/lib/utils";
import { ApiError, createPatient, searchPatients } from "@/lib/client-api";
import { avatarColor, initials } from "@/lib/avatar";
import type { SafePatient } from "@/types";

/** Radix Select has no concept of an empty value, so "unset" needs a token. */
const NONE = "__none__";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function PatientPicker({
  value,
  onChange,
  onCreatingChange,
}: {
  value: SafePatient | null;
  onChange: (p: SafePatient | null) => void;
  /**
   * Fired when the inline "new patient" form opens or closes, so the dialog
   * can hide the rest of its fields — creating a patient is a sub-task, not
   * something to stack on top of the appointment form.
   */
  onCreatingChange?: (creating: boolean) => void;
}) {
  const [term, setTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(0);
  // Set when the user closes the panel without picking, so it does not spring
  // back open while they keep typing.
  const [dismissed, setDismissed] = useState(false);
  const debounced = useDebounced(term, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const searching = term.trim().length > 0;
  const open = searching && !dismissed;

  // Only queried while there is something to search for — an untouched field
  // costs nothing.
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["patients", debounced],
    queryFn: () => searchPatients(debounced),
    enabled: !value && !adding && debounced.trim().length > 0,
    staleTime: 10_000,
  });

  const shown = useMemo(
    () => (debounced.trim() ? results : []),
    [results, debounced],
  );

  // Typing re-opens the panel after a previous dismissal.
  useEffect(() => setDismissed(false), [term]);

  useEffect(() => {
    onCreatingChange?.(adding);
  }, [adding, onCreatingChange]);

  // Clicking anywhere else closes it, the way a dropdown should behave.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setDismissed(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // The "create" row sits at the end of the list, so it is part of the same
  // keyboard sequence rather than a separate control to tab to.
  const createIndex = shown.length;

  useEffect(() => setActive(0), [debounced]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, createIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active === createIndex) setAdding(true);
      else if (shown[active]) onChange(shown[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setDismissed(true);
      }
    }
  }

  // A patient is chosen — show them as a card with a way back.
  if (value) {
    const name =
      value.display_name || `${value.first_name} ${value.last_name}`.trim();
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent px-4 py-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
            avatarColor(value.id),
          )}
        >
          {initials(value.first_name, value.last_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="truncate text-sm text-muted-foreground tnum">
            {[
              value.phone,
              dossierLabel(value),
              value.age != null ? `${value.age} ans` : "",
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(null);
            setTerm("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" /> Changer
        </Button>
      </div>
    );
  }

  if (adding) {
    return (
      <NewPatientForm
        defaultName={term}
        onCancel={() => setAdding(false)}
        onCreated={(p) => {
          setAdding(false);
          onChange(p);
        }}
      />
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setDismissed(false)}
          placeholder="Rechercher un patient (nom, téléphone, n° de dossier…)"
          className="h-11 pl-10 pr-10"
          role="combobox"
          aria-expanded={open}
          aria-controls="patient-results"
          aria-label="Rechercher un patient"
        />
        {isFetching ? (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : term ? (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              inputRef.current?.focus();
            }}
            aria-label="Effacer"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* With the list hidden, "create" would otherwise only be reachable from
          inside the dropdown — this keeps it available on an empty field. */}
      {!searching ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:underline"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Nouveau patient
        </button>
      ) : null}

      {/* Results float over the form and only exist while searching, so the
          dialog stays compact when the field is untouched. */}
      {open ? (
        <ul
          id="patient-results"
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 animate-scale-in overflow-y-auto scrollbar-slim rounded-xl border bg-popover shadow-modal"
        >
        {isFetching && shown.length === 0 ? (
          <li className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </li>
        ) : (
          <>
            {shown.map((p, i) => {
              const name =
                p.display_name || `${p.first_name} ${p.last_name}`.trim();
              return (
                <li key={p.id} data-idx={i}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => onChange(p)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      active === i ? "bg-accent" : "hover:bg-secondary",
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
                        {name || "—"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tnum">
                        {[
                          p.phone,
                          dossierLabel(p),
                          p.age != null ? `${p.age} ans` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </span>
                    {active === i ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                </li>
              );
            })}

            {debounced.trim() && shown.length === 0 && !isFetching ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucun patient pour « {debounced.trim()} »
              </li>
            ) : null}

            {/* Creating is the natural next step when nothing matched, so it
                lives at the end of the same list rather than in its own box. */}
            <li data-idx={createIndex} className="border-t">
              <button
                type="button"
                onMouseEnter={() => setActive(createIndex)}
                onClick={() => setAdding(true)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  active === createIndex ? "bg-accent" : "hover:bg-secondary",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                  {term.trim()
                    ? `Créer « ${term.trim()} »`
                    : "Créer un nouveau patient"}
                </span>
              </button>
            </li>
          </>
        )}
        </ul>
      ) : null}
    </div>
  );
}

function NewPatientForm({
  defaultName,
  onCancel,
  onCreated,
}: {
  defaultName: string;
  onCancel: () => void;
  onCreated: (p: SafePatient) => void;
}) {
  const [lastName, setLastName] = useState(defaultName);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(force = false) {
    if (!lastName.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const { id } = await createPatient({
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        phone: phone.trim(),
        gender,
        age: age ? Number(age) : null,
        force,
      });
      onCreated({
        id,
        // The doctor's app issues the file number on its next sync.
        registered: false,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        father_name: "",
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
        gender,
        age: age ? Number(age) : null,
        // Not collected in this quick booking form; the full set lives on the
        // Patients page. The backend assigns numero_dossier itself.
        address: "",
        email: "",
        job: "",
        date_of_birth: "",
        insurance_type: "",
        numero_dossier: "",
        created_at: "",
      });
      toast.success("Patient ajouté.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_PATIENT") {
        const ok = window.confirm(
          `${err.message}\n\nVoulez-vous quand même créer un nouveau patient ?`,
        );
        if (ok) {
          setSaving(false);
          await submit(true);
          return;
        }
      } else {
        toast.error(err instanceof ApiError ? err.message : "Échec de l'ajout.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nom *</Label>
          <Input
            autoFocus
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prénom</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Téléphone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="h-10 tnum"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Sexe</Label>
            <Select
              value={gender || NONE}
              onValueChange={(v) => setGender(v === NONE ? "" : v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Âge</Label>
            <Input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={3}
              className="h-10 tnum"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          Retour
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2"
          onClick={() => submit(false)}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Ajouter
        </Button>
      </div>
    </div>
  );
}

export { useDebounced };
