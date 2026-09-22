"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Combobox } from "@/components/ui/combobox";
import { GOVERNORATES, citiesFor, governorateOf } from "@/lib/tunisia";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_LABELS, PROVIDER_KIND_LABELS, type ProviderKind } from "@/types";
import { cn } from "@/lib/utils";

type Range = { weekday: number; opens_at: string; closes_at: string };
type Duty = { starts_at: string; ends_at: string; kind: string };
type Provider = Record<string, unknown> & {
  id: string;
  hours: Range[];
  duty: Duty[];
};

const KIND_OPTIONS = Object.entries(PROVIDER_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const FLAGS: { key: string; label: string }[] = [
  { key: "accepts_cnam", label: "Conventionné CNAM" },
  { key: "third_party_payer", label: "Tiers payant" },
  { key: "wheelchair_access", label: "Accès PMR" },
  { key: "accepts_new_patients", label: "Prend de nouveaux patients" },
  { key: "open_24_7", label: "Ouvert 24 h/24" },
  { key: "has_emergency", label: "Urgences" },
];

const BOOKING_MODES: { value: string; label: string; note: string }[] = [
  { value: "agenda", label: "Agenda en direct", note: "créneaux réels, poste appairé" },
  { value: "demande", label: "Sur demande", note: "le patient propose, vous rappelez" },
  { value: "aucune", label: "Sans rendez-vous", note: "horaires et itinéraire seulement" },
];

/** Datetime-local wants "YYYY-MM-DDTHH:mm"; Postgres hands back an ISO string. */
const toLocalInput = (iso: string) => (iso ? iso.slice(0, 16) : "");

export function ProviderEditor({ id }: { id: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Provider | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-provider", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/providers?id=${id}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Chargement impossible.");
      }
      return (await res.json()) as Provider;
    },
  });

  // The form is a working copy: edits must not be thrown away by a background
  // refetch, so it is seeded once and then owned by the component.
  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data: payload }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Enregistrement impossible.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-provider", id] });
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success("Enregistré.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async (published: boolean) => {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "publish", published }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Action impossible.");
      return published;
    },
    onSuccess: (published) => {
      setForm((f) => (f ? { ...f, is_published: published } : f));
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      toast.success(published ? "Fiche publiée." : "Fiche dépubliée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }
  if (isError) {
    return (
      <p className="rounded-xl border border-danger/25 bg-danger-soft p-5 text-sm text-danger-foreground">
        {(error as Error).message}
      </p>
    );
  }

  // Narrowed above, but the closures below lose it — bind it once.
  const p: Provider = form;
  const set = (k: string, v: unknown) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const str = (k: string) => String(p[k] ?? "");
  const bool = (k: string) => p[k] === true;
  const published = bool("is_published");
  const isPharmacy = str("kind") === "pharmacie" || str("kind") === "parapharmacie";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({
      name: str("name"),
      kind: str("kind"),
      bio: str("bio"),
      photo_url: str("photo_url"),
      address: str("address"),
      city: str("city"),
      postcode: str("postcode"),
      governorate: str("governorate"),
      latitude: str("latitude"),
      longitude: str("longitude"),
      phone: str("phone"),
      phone_alt: str("phone_alt"),
      email: str("email"),
      website: str("website"),
      booking_mode: str("booking_mode"),
      ...Object.fromEntries(FLAGS.map((f) => [f.key, bool(f.key)])),
      hours: p.hours,
      duty: p.duty,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/etablissements"
          className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight">{str("name")}</h1>
          <p className="font-mono text-xs text-muted-foreground">/{str("slug")}</p>
        </div>

        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[0.7rem] font-bold",
            published ? "bg-ok-soft text-ok-foreground" : "bg-warn-soft text-warn-foreground",
          )}
        >
          {published ? "Publiée" : "Brouillon"}
        </span>

        {published ? (
          <Link
            href={`/etablissement/${str("slug")}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] border px-3 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Voir <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        ) : null}

        <button
          type="button"
          disabled={publish.isPending}
          onClick={() => publish.mutate(!published)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-[0.625rem] px-4 text-sm font-bold transition-all disabled:opacity-60",
            published
              ? "border border-border text-muted-foreground"
              : "bg-clay text-white hover:brightness-110",
          )}
        >
          {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {published ? "Dépublier" : "Publier"}
        </button>

        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-[0.625rem] bg-primary px-4 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>

      <Card title="Identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" value={str("name")} onChange={(v) => set("name", v)} />
          <PickerField label="Métier">
            {/* Not a native <select>: a browser's own option list is drawn by
                the OS and cannot be themed at all — it arrives with a
                Windows-blue highlight in the middle of the console. */}
            <Combobox
              value={str("kind")}
              onChange={(v) => set("kind", v)}
              options={KIND_OPTIONS}
              clearable={false}
              placeholder="Choisir un métier"
              searchPlaceholder="Métier…"
              className="h-11 rounded-[0.625rem] text-sm"
            />
          </PickerField>
        </div>
        <Field
          label="Présentation"
          value={str("bio")}
          onChange={(v) => set("bio", v)}
          textarea
        />
        <Field
          label="Photo (URL)"
          value={str("photo_url")}
          onChange={(v) => set("photo_url", v)}
        />
      </Card>

      <Card title="Adresse et contact">
        <Field label="Adresse" value={str("address")} onChange={(v) => set("address", v)} />
        {/* Gouvernorat leads, because picking it narrows the city list below
            it. A closed list of 24 for the governorate — typing it freehand is
            how one column ends up holding "Ben Arous", "ben arous" and
            "Ben-Arous" — and an open one for the city, since our delegation
            list will never cover every village. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <PickerField label="Gouvernorat">
            <Combobox
              value={str("governorate")}
              onChange={(v) => set("governorate", v)}
              options={GOVERNORATES}
              placeholder="Choisir un gouvernorat"
              searchPlaceholder="Gouvernorat…"
              className="h-11 rounded-[0.625rem] text-sm"
            />
          </PickerField>
          <PickerField label="Ville">
            <Combobox
              value={str("city")}
              onChange={(v) => {
                set("city", v);
                // A known city implies its governorate, so fill it in rather
                // than making someone pick the obvious twice. Only when it is
                // still blank — never overwrite a deliberate choice.
                if (v && !str("governorate")) {
                  const gov = governorateOf(v);
                  if (gov) set("governorate", gov);
                }
              }}
              options={citiesFor(str("governorate"))}
              allowCustom
              placeholder="Choisir une ville"
              searchPlaceholder="Ville ou délégation…"
              emptyLabel="Aucune ville connue — tapez la vôtre"
              className="h-11 rounded-[0.625rem] text-sm"
            />
          </PickerField>
          <Field label="Code postal" value={str("postcode")} onChange={(v) => set("postcode", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Latitude"
            value={str("latitude")}
            onChange={(v) => set("latitude", v)}
            hint="Laissez vide si inconnue — le tri par distance l'ignorera."
          />
          <Field
            label="Longitude"
            value={str("longitude")}
            onChange={(v) => set("longitude", v)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone" value={str("phone")} onChange={(v) => set("phone", v)} />
          <Field
            label="Téléphone secondaire"
            value={str("phone_alt")}
            onChange={(v) => set("phone_alt", v)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" value={str("email")} onChange={(v) => set("email", v)} />
          <Field label="Site web" value={str("website")} onChange={(v) => set("website", v)} />
        </div>
      </Card>

      <Card title="Comment on prend rendez-vous">
        <div className="grid gap-3 sm:grid-cols-3">
          {BOOKING_MODES.map((m) => {
            const on = str("booking_mode") === m.value;
            return (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors",
                  on ? "border-primary bg-accent" : "border-border hover:bg-secondary",
                )}
              >
                <input
                  type="radio"
                  name="booking_mode"
                  checked={on}
                  onChange={() => set("booking_mode", m.value)}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.note}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          « Agenda en direct » n&apos;affiche des créneaux que si un poste est
          appairé. Sans cela la fiche retombe sur « sur demande ».
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map((f) => (
            <label key={f.key} className="flex cursor-pointer items-center gap-2.5 py-1">
              <input
                type="checkbox"
                checked={bool(f.key)}
                onChange={(e) => set(f.key, e.target.checked)}
                className="h-[1.05rem] w-[1.05rem]"
              />
              <span className="text-sm">{f.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Horaires">
        <p className="text-xs text-muted-foreground">
          Une ligne par plage. Un jour avec pause déjeuner en a deux.
        </p>
        {DAY_LABELS.map((label, i) => {
          const day = i + 1;
          const ranges = p.hours.filter((h) => h.weekday === day);
          return (
            <div key={label} className="flex flex-wrap items-center gap-2 border-t py-2.5 first:border-0">
              <span className="w-24 shrink-0 text-sm font-semibold">{label}</span>
              {ranges.length === 0 ? (
                <span className="text-sm text-muted-foreground">Fermé</span>
              ) : null}
              {ranges.map((r) => {
                const idx = p.hours.indexOf(r);
                return (
                  <span key={idx} className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={r.opens_at}
                      onChange={(e) => {
                        const next = [...p.hours];
                        next[idx] = { ...r, opens_at: e.target.value };
                        set("hours", next);
                      }}
                      className="h-9 rounded-md border border-input bg-card px-2 font-mono text-sm"
                    />
                    <span className="text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={r.closes_at}
                      onChange={(e) => {
                        const next = [...p.hours];
                        next[idx] = { ...r, closes_at: e.target.value };
                        set("hours", next);
                      }}
                      className="h-9 rounded-md border border-input bg-card px-2 font-mono text-sm"
                    />
                    <button
                      type="button"
                      aria-label="Supprimer la plage"
                      onClick={() =>
                        set("hours", p.hours.filter((_, n) => n !== idx))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  set("hours", [
                    ...p.hours,
                    { weekday: day, opens_at: "08:00", closes_at: "13:00" },
                  ])
                }
                className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Plage
              </button>
            </div>
          );
        })}
      </Card>

      {isPharmacy ? (
        <Card title="Gardes">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Début et fin réels. Une garde de nuit va de 20:00 un jour à 08:00 le
            lendemain — c&apos;est pour cela que la date de fin est demandée.
          </p>
          {p.duty.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune garde enregistrée.</p>
          ) : null}
          {p.duty.map((d, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2 border-t py-2.5 first:border-0">
              <input
                type="datetime-local"
                value={toLocalInput(d.starts_at)}
                onChange={(e) => {
                  const next = [...p.duty];
                  next[idx] = { ...d, starts_at: e.target.value };
                  set("duty", next);
                }}
                className="h-9 rounded-md border border-input bg-card px-2 font-mono text-sm"
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="datetime-local"
                value={toLocalInput(d.ends_at)}
                onChange={(e) => {
                  const next = [...p.duty];
                  next[idx] = { ...d, ends_at: e.target.value };
                  set("duty", next);
                }}
                className="h-9 rounded-md border border-input bg-card px-2 font-mono text-sm"
              />
              <Select
                value={d.kind}
                onValueChange={(v) => {
                  const next = [...p.duty];
                  next[idx] = { ...d, kind: v };
                  set("duty", next);
                }}
              >
                <SelectTrigger className="h-9 w-[7.5rem] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuit" className="text-sm">Nuit</SelectItem>
                  <SelectItem value="jour" className="text-sm">Jour</SelectItem>
                  <SelectItem value="ferie" className="text-sm">Férié</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label="Supprimer la garde"
                onClick={() => set("duty", p.duty.filter((_, n) => n !== idx))}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set("duty", [...p.duty, { starts_at: "", ends_at: "", kind: "nuit" }])
            }
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Ajouter une garde
          </button>
        </Card>
      ) : null}
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-card">
      <h2 className="text-[0.95rem] font-bold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Field chrome for a control that is not an <input>.
 *
 * A plain <div>, not a <label>: a label wrapping a <button> forwards clicks to
 * it, so clicking the word "Gouvernorat" would fire the trigger a second time
 * and close the list it just opened.
 */
function PickerField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  hint?: string;
}) {
  const cls =
    "rounded-[0.625rem] border border-input bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(cls, "py-2.5 leading-relaxed")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(cls, "h-11")}
        />
      )}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
