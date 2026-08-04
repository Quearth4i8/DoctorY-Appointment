"use client";

import { useEffect, useState } from "react";
import { Contact, IdCard, Loader2, Save, UserPlus, UserRound } from "lucide-react";
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
import { ApiError, createPatient, updatePatient } from "@/lib/client-api";
import { todayKey } from "@/lib/scheduler";
import type { PatientAdminInput, SafePatient } from "@/types";

/** Matches the options the doctor's desktop app offers, so the two agree. */
const INSURANCE_OPTIONS = ["Aucune assurance", "CNAM", "Privée"] as const;

/** Radix Select has no concept of an empty value, so "unset" needs a token. */
const NONE = "__none__";

// No `age`: it is not a field, it is what the date of birth means today. It is
// computed on the way out, so there is no second copy to fall out of step.
const EMPTY = {
  last_name: "",
  first_name: "",
  father_name: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  job: "",
  address: "",
  email: "",
  insurance_type: "",
  numero_dossier: "",
};

type FormState = typeof EMPTY;

/**
 * Age from a date of birth, or null when there isn't a usable one.
 *
 * The strict format check matters: `date_of_birth` is a text column, and rows
 * lifted from doctor.db may hold something this cannot read. Null then means
 * "you tell me" rather than a wrong number, and the field stays typeable.
 */
function ageFromDob(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const months = now.getMonth() - born.getMonth();
  // Not had this year's birthday yet.
  if (months < 0 || (months === 0 && now.getDate() < born.getDate())) age -= 1;

  return age >= 0 && age <= 130 ? age : null;
}

function fromPatient(p: SafePatient): FormState {
  return {
    last_name: p.last_name,
    first_name: p.first_name,
    father_name: p.father_name,
    phone: p.phone,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
    job: p.job,
    address: p.address,
    email: p.email,
    insurance_type: p.insurance_type,
    numero_dossier: p.numero_dossier,
  };
}

function toInput(f: FormState): PatientAdminInput {
  return {
    last_name: f.last_name.trim(),
    first_name: f.first_name.trim(),
    father_name: f.father_name.trim(),
    phone: f.phone.trim(),
    gender: f.gender,
    // Still written to the column the desktop app and the public form both
    // read — it is just derived here rather than typed.
    age: ageFromDob(f.date_of_birth),
    date_of_birth: f.date_of_birth.trim(),
    job: f.job.trim(),
    address: f.address.trim(),
    email: f.email.trim(),
    insurance_type: f.insurance_type,
    numero_dossier: f.numero_dossier.trim(),
  };
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null → create a new patient; otherwise edit this one. */
  patient: SafePatient | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = patient !== null;

  useEffect(() => {
    if (open) setForm(patient ? fromPatient(patient) : EMPTY);
  }, [open, patient]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const derivedAge = ageFromDob(form.date_of_birth);

  async function submit(force = false) {
    if (!form.last_name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    // Tested through the age rather than for emptiness, so a legacy value this
    // cannot read — doctor.db holds some as "12/03/1969" — is caught too. The
    // date input shows those as blank anyway, so the field already looks unset.
    if (derivedAge === null) {
      toast.error("Renseignez une date de naissance valide.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updatePatient(patient.id, toInput(form));
        toast.success("Patient mis à jour.");
      } else {
        await createPatient({ ...toInput(form), force });
        toast.success("Patient ajouté.");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      // A same-name patient already exists — offer to create anyway.
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
        toast.error(
          err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 scrollbar-slim sm:max-w-2xl">
        <DialogHeader className="sticky top-0 z-10 border-b bg-card/85 px-6 py-5 backdrop-blur">
          <DialogTitle className="text-xl tracking-tight">
            {isEdit ? "Modifier le patient" : "Nouveau patient"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Coordonnées et informations administratives."
              : "Le nom et la date de naissance sont obligatoires."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-7 px-6 py-6">
          {/* First, because it is how this patient is referred to everywhere
              else — on the carnet, on an ordonnance, over the phone. */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-muted/30 px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IdCard className="h-[1.05rem] w-[1.05rem]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label className="text-sm font-medium">N° de dossier</Label>
              <Input
                value={form.numero_dossier}
                onChange={(e) => set("numero_dossier", e.target.value)}
                placeholder="ex. 83/2026"
                className="tnum bg-card sm:max-w-[16rem]"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Laisser vide pour conserver le numéro actuel."
                  : "Laisser vide : le médecin en attribue un à la prochaine synchronisation."}
              </p>
            </div>
          </div>

          <Section icon={UserRound} title="Identité">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" required>
                <Input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="Ben Ali"
                  autoFocus
                />
              </Field>
              <Field label="Prénom">
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="Mohamed"
                />
              </Field>
              <Field label="Nom du père">
                <Input
                  value={form.father_name}
                  onChange={(e) => set("father_name", e.target.value)}
                  placeholder="Ahmed"
                />
              </Field>
              <Field label="Sexe">
                <Select
                  value={form.gender || NONE}
                  onValueChange={(v) => set("gender", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date de naissance" required>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  max={todayKey()}
                  className="tnum"
                />
              </Field>

              {/* Not a field. Nothing here is typeable, nothing is submitted —
                  it is the date above, read back as what it means today. It
                  disappears rather than showing a placeholder, because an empty
                  box invites someone to fill it in. */}
              {derivedAge !== null ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Âge
                  </Label>
                  <p className="flex h-11 items-center rounded-lg bg-muted/50 px-3.5 text-[0.95rem] font-medium text-foreground tnum">
                    {derivedAge} ans
                  </p>
                </div>
              ) : null}
            </div>
          </Section>

          <Section icon={Contact} title="Coordonnées">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone">
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  inputMode="tel"
                  placeholder="20 123 456"
                  className="tnum"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="nom@exemple.tn"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Adresse">
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="12 rue de Carthage, Tunis"
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={IdCard} title="Administratif">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Profession">
                <Input
                  value={form.job}
                  onChange={(e) => set("job", e.target.value)}
                  placeholder="Enseignant"
                />
              </Field>
              <Field label="Assurance">
                <Select
                  value={form.insurance_type || NONE}
                  onValueChange={(v) => set("insurance_type", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {INSURANCE_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 flex gap-3 border-t bg-card/85 px-6 py-4 backdrop-blur">
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
            onClick={() => submit(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
