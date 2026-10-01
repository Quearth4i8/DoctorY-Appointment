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
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ApiError, createPatient, updatePatient } from "@/lib/client-api";
import { INSURANCE_OPTIONS } from "@/lib/insurance";
import { todayKey } from "@/lib/scheduler";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { PatientAdminInput, SafePatient } from "@/types";


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

  const confirm = useConfirm();

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
        const ok = await confirm({
          title: "Un patient porte déjà ce nom",
          description: `${err.message} Voulez-vous quand même créer un nouveau patient ?`,
          confirmLabel: "Créer quand même",
        });
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

  const previewName =
    `${form.first_name} ${form.last_name}`.trim() || (isEdit ? "Patient" : "Nouveau patient");
  // A record that has an age but no readable birth date (older doctor.db
  // rows): say what is known, so the required field is not a mystery.
  const knownAge = isEdit && derivedAge === null && patient?.age != null ? patient.age : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 scrollbar-slim sm:max-w-2xl">
        {/* Header: who this is, updating as it is typed. */}
        <DialogHeader className="sticky top-0 z-10 border-b bg-card/90 px-6 py-5 backdrop-blur">
          <div className="flex items-center gap-4 pr-8">
            <span
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold",
                patient ? avatarColor(patient.id) : "bg-primary/10 text-primary",
              )}
            >
              {form.first_name || form.last_name ? (
                initials(form.first_name, form.last_name)
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate text-lg tracking-tight">
                {isEdit ? `Modifier · ${previewName}` : previewName}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Coordonnées et informations administratives."
                  : "Le nom et la date de naissance sont obligatoires."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-6">
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
                    <SelectItem value="M">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Date de naissance"
                  required
                  aside={
                    derivedAge !== null ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tnum">
                        {derivedAge} ans
                      </span>
                    ) : null
                  }
                  hint={
                    knownAge !== null
                      ? `Âge enregistré : ${knownAge} ans — indiquez la date de naissance pour enregistrer.`
                      : undefined
                  }
                >
                  <DatePicker
                    value={form.date_of_birth}
                    onChange={(v) => set("date_of_birth", v)}
                    max={todayKey()}
                    dropdowns
                    placeholder="Choisir la date de naissance"
                  />
                </Field>
              </div>
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
              <Field
                label="N° de dossier"
                hint={
                  isEdit
                    ? "Laisser vide pour conserver le numéro actuel."
                    : "Vide : le médecin en attribue un à la prochaine synchronisation."
                }
              >
                <Input
                  value={form.numero_dossier}
                  onChange={(e) => set("numero_dossier", e.target.value)}
                  placeholder="ex. 83/2026"
                  className="tnum"
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
              <Field label="Profession">
                <Input
                  value={form.job}
                  onChange={(e) => set("job", e.target.value)}
                  placeholder="Enseignant"
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-card/90 px-6 py-4 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-w-40"
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
            {isEdit ? "Enregistrer" : "Ajouter le patient"}
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
    <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
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
  aside,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Shown at the end of the label row — the computed age, for instance. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {aside}
      </div>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
