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
import type { PatientAdminInput, SafePatient } from "@/types";

/** Matches the options the doctor's desktop app offers, so the two agree. */
const INSURANCE_OPTIONS = ["Aucune assurance", "CNAM", "Privée"] as const;

/** Radix Select has no concept of an empty value, so "unset" needs a token. */
const NONE = "__none__";

const EMPTY = {
  last_name: "",
  first_name: "",
  father_name: "",
  phone: "",
  gender: "",
  age: "",
  date_of_birth: "",
  job: "",
  address: "",
  email: "",
  insurance_type: "",
  numero_dossier: "",
};

type FormState = typeof EMPTY;

function fromPatient(p: SafePatient): FormState {
  return {
    last_name: p.last_name,
    first_name: p.first_name,
    father_name: p.father_name,
    phone: p.phone,
    gender: p.gender,
    age: p.age == null ? "" : String(p.age),
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
    age: f.age ? Number(f.age) : null,
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

  async function submit(force = false) {
    if (!form.last_name.trim()) {
      toast.error("Le nom est obligatoire.");
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
              : "Seul le nom est obligatoire."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-7 px-6 py-6">
          <Section icon={UserRound} title="Identité">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" required>
                <Input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  autoFocus
                />
              </Field>
              <Field label="Prénom">
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </Field>
              <Field label="Nom du père">
                <Input
                  value={form.father_name}
                  onChange={(e) => set("father_name", e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sexe">
                  <Select
                    value={form.gender || NONE}
                    onValueChange={(v) => set("gender", v === NONE ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      <SelectItem value="M">Homme</SelectItem>
                      <SelectItem value="F">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Âge">
                  <Input
                    value={form.age}
                    onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    maxLength={3}
                    className="tnum"
                  />
                </Field>
              </div>
              <Field label="Date de naissance">
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  className="tnum"
                />
              </Field>
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
                />
              </Field>
              <Field label="Assurance">
                <Select
                  value={form.insurance_type || NONE}
                  onValueChange={(v) => set("insurance_type", v === NONE ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="sm:col-span-2">
                <Field
                  label="N° de dossier"
                  hint={
                    isEdit
                      ? "Laisser vide pour conserver le numéro actuel."
                      : "Attribué automatiquement si vide."
                  }
                >
                  <Input
                    value={form.numero_dossier}
                    onChange={(e) => set("numero_dossier", e.target.value)}
                    placeholder="ex. 83/2026"
                    className="tnum sm:max-w-[16rem]"
                  />
                </Field>
              </div>
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
