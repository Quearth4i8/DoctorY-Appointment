"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ImageOff,
  Link2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import {
  SpecialtyTagInput,
  type SpecialtyValue,
} from "@/components/settings/specialty-tag-input";
import { createClient } from "@/lib/supabase/client";
import { osmEmbedUrl, parseLatLng } from "@/lib/geo";
import { joinPhones, splitPhones } from "@/lib/phones";
import { ALL_CITY_OPTIONS } from "@/lib/tunisia";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  type DayHours,
  type Doctor,
  type Specialty,
  type Tariff,
} from "@/types";

/** Two ranges per day (morning / afternoon) covers how a practice actually runs. */
type DayForm = { open: boolean; ranges: [string, string][] };

function toDayForms(hours: DayHours[]): DayForm[] {
  const byDay = new Map(hours.map((h) => [h.day, h.ranges]));
  return DAY_LABELS.map((_, i) => {
    const ranges = byDay.get(i + 1) ?? [];
    return {
      open: ranges.length > 0,
      ranges: ranges.length
        ? (ranges.map((r) => [r[0], r[1]]) as [string, string][])
        : [["08:00", "13:00"]],
    };
  });
}

function toHours(days: DayForm[]): DayHours[] {
  return days
    .map((d, i) => ({
      day: i + 1,
      ranges: d.open
        ? d.ranges.filter(([a, b]) => a && b).map(([a, b]) => [a, b] as [string, string])
        : [],
    }))
    .filter((d) => d.ranges.length > 0);
}

/** How many a single practice may claim — mirrors the cap in the RPC. */
const MAX_SPECIALTIES = 8;

export function DoctorSettingsForm({
  doctor,
  /** The closed taxonomy, already narrowed to what a cabinet may claim. */
  specialtyOptions,
  /** Slugs this practice offers today. */
  selectedSpecialties,
  pairing,
}: {
  doctor: Doctor;
  specialtyOptions: Specialty[];
  /** What this practice offers today: taxonomy slugs plus its own entries. */
  selectedSpecialties: SpecialtyValue;
  /** The app-linking card, shown as the last section of the page. */
  pairing?: React.ReactNode;
}) {
  const router = useRouter();

  // No `title`: it is "Dr" for every profile this app holds, filled in on the
  // way out by `normalise()`. Asking for it was a field that could only be
  // typed wrong. Leaving it out of the patch also leaves any value already in
  // the column untouched, so a "Pr" set by hand survives a save from here.
  const [profile, setProfile] = useState({
    full_name: doctor.full_name,
    specialty: doctor.specialty,
    bio: doctor.bio,
    photo_url: doctor.photo_url,
    address: doctor.address,
    city: doctor.city,
    phone: doctor.phone,
    email: doctor.email,
  });
  const [specialties, setSpecialties] =
    useState<SpecialtyValue>(selectedSpecialties);
  const [days, setDays] = useState<DayForm[]>(() => toDayForms(doctor.hours));
  const [tariffs, setTariffs] = useState<Tariff[]>(doctor.tariffs);
  // One field per number; saved back into the single `phone` column joined
  // with " / " (see lib/phones). Always at least one row to type into.
  const [phones, setPhones] = useState<string[]>(() => {
    const list = splitPhones(doctor.phone);
    return list.length ? list : [""];
  });
  const [lat, setLat] = useState(doctor.latitude?.toString() ?? "");
  const [lng, setLng] = useState(doctor.longitude?.toString() ?? "");
  const [mapInput, setMapInput] = useState("");
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const [published, setPublished] = useState(doctor.is_published);
  const [saving, setSaving] = useState(false);

  /** Accepts a pasted Maps link or raw coordinates and fills the two fields. */
  function onMapInput(value: string) {
    setMapInput(value);
    if (!value.trim()) {
      setCoordsError(null);
      return;
    }
    const parsed = parseLatLng(value);
    if (parsed) {
      setLat(String(parsed.lat));
      setLng(String(parsed.lng));
      setCoordsError(null);
    } else {
      setCoordsError(
        "Coordonnées introuvables dans ce texte. Collez un lien Maps complet ou « latitude, longitude ».",
      );
    }
  }

  const preview =
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat && lng
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  function setField(key: keyof typeof profile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function setDay(i: number, patch: Partial<DayForm>) {
    setDays((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function setRange(dayIdx: number, rangeIdx: number, which: 0 | 1, value: string) {
    setDays((d) =>
      d.map((x, j) => {
        if (j !== dayIdx) return x;
        const ranges = x.ranges.map((r, k) => {
          if (k !== rangeIdx) return r;
          const copy: [string, string] = [r[0], r[1]];
          copy[which] = value;
          return copy;
        });
        return { ...x, ranges };
      }),
    );
  }

  // What is on screen vs what was loaded, to say "modifications non
  // enregistrées" and offer to undo them.
  const snapshot = JSON.stringify({ profile, specialties, days, tariffs, phones, lat, lng, published });
  const [initial, setInitial] = useState(snapshot);
  const dirty = snapshot !== initial;

  function resetAll() {
    setProfile({
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      bio: doctor.bio,
      photo_url: doctor.photo_url,
      address: doctor.address,
      city: doctor.city,
      phone: doctor.phone,
      email: doctor.email,
    });
    setSpecialties(selectedSpecialties);
    setDays(toDayForms(doctor.hours));
    setTariffs(doctor.tariffs);
    const list = splitPhones(doctor.phone);
    setPhones(list.length ? list : [""]);
    setLat(doctor.latitude?.toString() ?? "");
    setLng(doctor.longitude?.toString() ?? "");
    setMapInput("");
    setCoordsError(null);
    setPublished(doctor.is_published);
  }

  /** Monday's hours onto every other open day — most cabinets keep one rhythm. */
  function copyMondayToOpenDays() {
    const monday = days[0];
    if (!monday.open) {
      toast.error("Ouvrez d'abord le lundi pour copier ses horaires.");
      return;
    }
    setDays((d) =>
      d.map((x, i) => (i === 0 || !x.open ? x : { ...x, ranges: monday.ranges.map((r) => [r[0], r[1]] as [string, string]) })),
    );
    toast.success("Horaires du lundi copiés sur les jours ouverts.");
  }

  const activeSection = useActiveSection(SECTIONS.map((x) => x.id));
  const openDays = days.filter((d) => d.open).length;

  async function save() {
    if (!profile.full_name.trim()) {
      toast.error("Le nom du médecin est obligatoire.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    // `specialty` is no longer written from here: set_doctor_specialties owns
    // it, so that the free-text summary and provider_specialties can never
    // disagree about what this practice does.
    const { specialty: _ignored, ...editable } = profile;

    const { error } = await supabase
      .from("doctors")
      .update({
        ...editable,
        phone: joinPhones(phones),
        full_name: profile.full_name.trim(),
        latitude: preview ? preview.lat : null,
        longitude: preview ? preview.lng : null,
        hours: toHours(days),
        tariffs: tariffs
          .filter((t) => t.label.trim())
          .map((t) => ({
            label: t.label.trim(),
            amount: Number(t.amount) || 0,
            note: t.note?.trim() ?? "",
          })),
        is_published: published,
      })
      .eq("id", doctor.id);
    setSaving(false);

    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }

    // Separate call because this one crosses into `provider_specialties`,
    // which staff cannot write directly.
    const { data: verdict, error: specError } = await supabase.rpc(
      "set_doctor_specialties",
      { p_slugs: specialties.slugs, p_custom: specialties.custom },
    );

    if (specError || !(verdict as { ok?: boolean } | null)?.ok) {
      toast.error("Profil enregistré, mais les spécialités n'ont pas pu l'être.");
      router.refresh();
      return;
    }

    toast.success("Profil enregistré.");
    setInitial(snapshot);
    router.refresh();
  }

  const displayName = `${doctor.title?.trim() || "Dr"} ${profile.full_name}`.trim();
  const specialtyCount = specialties.slugs.length + specialties.custom.length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header: the doctor as patients see them ─────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-card bg-mesh shadow-card">
        <div className="flex flex-wrap items-center gap-5 px-6 py-6 lg:px-8">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photo_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-border/60 bg-card object-cover shadow-card"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-muted-foreground">
              <ImageOff className="h-6 w-6" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {displayName || "Nom du médecin"}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  published ? "bg-ok-soft text-ok-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", published ? "bg-ok" : "bg-muted-foreground/50")} />
                {published ? "En ligne" : "Non publié"}
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {specialtyCount > 0
                  ? `${specialtyCount} spécialité${specialtyCount > 1 ? "s" : ""}`
                  : "Aucune spécialité"}
              </span>
              {profile.city ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.city}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {openDays} jour{openDays > 1 ? "s" : ""} d&apos;ouverture
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {doctor.is_published ? (
              <Button asChild variant="outline" className="gap-2">
                <a href={`/medecins/${doctor.slug}`} target="_blank" rel="noreferrer">
                  Voir en ligne <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button
              variant={published ? "outline" : "default"}
              className="gap-2"
              onClick={() => setPublished((v) => !v)}
            >
              {published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {published ? "Dépublier" : "Publier"}
            </Button>
          </div>
        </div>
        {published !== doctor.is_published ? (
          <p className="border-t border-border/60 bg-warn-soft/60 px-6 py-2 text-xs font-medium text-warn-foreground lg:px-8">
            {published
              ? "La fiche sera visible des patients après l'enregistrement."
              : "La fiche sera retirée du site après l'enregistrement."}
          </p>
        ) : null}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* ── Section menu ─────────────────────────────────────────────── */}
        <nav aria-label="Sections" className="hidden lg:sticky lg:top-[calc(var(--app-header-h)+1.5rem)] lg:block">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.filter((x) => x.id !== "liaison" || pairing).map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          {/* ── Identité ───────────────────────────────────────────────── */}
          <Section id="identite" icon={UserRound} title="Identité" hint="Le nom, la photo et la présentation en tête de la fiche.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Nom complet" required>
                <Input
                  value={profile.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="Prénom NOM"
                />
              </Field>
              <Field label="Photo" hint="Adresse (URL) d'une image. L'aperçu s'affiche en haut de la page.">
                <Input
                  value={profile.photo_url}
                  onChange={(e) => setField("photo_url", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="Spécialités"
                  hint={`Ce que les patients peuvent chercher pour vous trouver — jusqu'à ${MAX_SPECIALTIES}.`}
                >
                  <SpecialtyTagInput
                    options={specialtyOptions}
                    value={specialties}
                    onChange={setSpecialties}
                    max={MAX_SPECIALTIES}
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field
                  label="Présentation"
                  hint={`${profile.bio.length} caractère${profile.bio.length > 1 ? "s" : ""} — quelques lignes suffisent.`}
                >
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setField("bio", e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] shadow-inner-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:shadow-glow focus-visible:outline-none"
                    placeholder="Parcours, approche, langues parlées…"
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <Section id="contact" icon={Phone} title="Contact" hint="Comment les patients joignent le cabinet.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={phones.length > 1 ? "Téléphones" : "Téléphone"}>
                <div className="flex flex-col gap-2">
                  {phones.map((value, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(e) =>
                          setPhones((list) => list.map((p, j) => (j === i ? e.target.value : p)))
                        }
                        inputMode="tel"
                        placeholder="+216 XX XXX XXX"
                        className="tnum"
                        aria-label={`Téléphone ${i + 1}`}
                      />
                      {phones.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setPhones((list) => list.filter((_, j) => j !== i))}
                          aria-label={`Retirer le téléphone ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {phones.length < 4 ? (
                    <button
                      type="button"
                      onClick={() => setPhones((list) => [...list, ""])}
                      className="inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajouter un numéro
                    </button>
                  ) : null}
                </div>
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="cabinet@exemple.tn"
                />
              </Field>
            </div>
          </Section>

          {/* ── Localisation ───────────────────────────────────────────── */}
          <Section id="localisation" icon={MapPin} title="Localisation" hint="L'adresse affichée et le point sur la carte.">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Adresse">
                <Input
                  value={profile.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="N°, rue, étage…"
                />
              </Field>
              <Field label="Ville">
                <Combobox
                  value={profile.city}
                  onChange={(v) => setField("city", v)}
                  options={ALL_CITY_OPTIONS}
                  allowCustom
                  placeholder="Choisir une ville"
                  searchPlaceholder="Ville ou délégation…"
                  emptyLabel="Aucune ville connue — tapez la vôtre"
                />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Position sur la carte"
                  hint="Collez un lien Google Maps complet, ou les coordonnées « latitude, longitude »."
                >
                  <Input
                    value={mapInput}
                    onChange={(e) => onMapInput(e.target.value)}
                    placeholder="https://www.google.com/maps/… ou 36.8065, 10.1815"
                  />
                </Field>
                {coordsError ? <p className="mt-1.5 text-xs text-destructive">{coordsError}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2 lg:col-span-1">
                <Field label="Latitude">
                  <Input
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      setCoordsError(null);
                    }}
                    inputMode="decimal"
                    className="tnum"
                  />
                </Field>
                <Field label="Longitude">
                  <Input
                    value={lng}
                    onChange={(e) => {
                      setLng(e.target.value);
                      setCoordsError(null);
                    }}
                    inputMode="decimal"
                    className="tnum"
                  />
                </Field>
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                {preview ? (
                  <div className="overflow-hidden rounded-xl border">
                    <iframe
                      src={osmEmbedUrl(preview)}
                      title="Aperçu de la localisation"
                      loading="lazy"
                      className="h-44 w-full border-0"
                    />
                  </div>
                ) : (
                  <p className="flex h-full items-center rounded-xl bg-secondary px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    Dans Google Maps : clic droit sur le cabinet → « Copier les coordonnées »,
                    puis collez-les ci-dessus. Un lien court (maps.app.goo.gl) ne contient pas
                    les coordonnées : ouvrez-le d&apos;abord, puis copiez l&apos;adresse complète.
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* ── Horaires ───────────────────────────────────────────────── */}
          <Section
            id="horaires"
            icon={Clock}
            title="Horaires de consultation"
            hint="Les créneaux proposés aux patients suivent ces horaires."
            action={
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={copyMondayToOpenDays}>
                <Copy className="h-3.5 w-3.5" /> Copier le lundi
              </Button>
            }
          >
            <ul className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/70">
              {DAY_LABELS.map((label, i) => {
                const day = days[i];
                return (
                  <li key={label} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <label className="flex w-36 shrink-0 cursor-pointer items-center gap-3">
                      <Switch checked={day.open} onChange={(v) => setDay(i, { open: v })} label={`${label} ouvert`} />
                      <span className={cn("text-sm font-semibold", day.open ? "text-foreground" : "text-muted-foreground")}>
                        {label}
                      </span>
                    </label>

                    {day.open ? (
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        {day.ranges.map((r, k) => (
                          <span
                            key={k}
                            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/25 px-1.5 py-1"
                          >
                            <TimePicker
                              value={r[0]}
                              onChange={(v) => setRange(i, k, 0, v)}
                              step={30}
                              className="h-9 w-[7.5rem] border-transparent px-2.5 shadow-none"
                            />
                            <span className="text-muted-foreground">–</span>
                            <TimePicker
                              value={r[1]}
                              onChange={(v) => setRange(i, k, 1, v)}
                              step={30}
                              className="h-9 w-[7.5rem] border-transparent px-2.5 shadow-none"
                            />
                            {day.ranges.length > 1 ? (
                              <button
                                type="button"
                                aria-label="Supprimer la plage"
                                onClick={() =>
                                  setDay(i, { ranges: day.ranges.filter((_, j) => j !== k) })
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                        {day.ranges.length < 2 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => setDay(i, { ranges: [...day.ranges, ["15:00", "18:00"]] })}
                          >
                            <Plus className="h-3.5 w-3.5" /> Deuxième plage
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground/70">Fermé</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* ── Tarifs ─────────────────────────────────────────────────── */}
          <Section id="tarifs" icon={Wallet} title="Tarifs" hint="Affichés sur la fiche. Laissez vide pour ne rien afficher.">
            <div className="flex flex-col gap-2.5">
              {tariffs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-6 text-center text-sm text-muted-foreground">
                  Aucun tarif affiché aux patients.
                </p>
              ) : (
                <div className="hidden grid-cols-[minmax(0,1fr)_8rem_2.25rem] gap-2 px-1.5 text-xs font-medium text-muted-foreground sm:grid">
                  <span>Prestation</span>
                  <span className="text-right">Prix</span>
                  <span />
                </div>
              )}

              {tariffs.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_8rem_2.25rem] items-center gap-2 rounded-xl border border-border/60 bg-muted/25 p-1.5"
                >
                  <Input
                    value={t.label}
                    onChange={(e) =>
                      setTariffs((ts) => ts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Consultation"
                    className="h-10 border-transparent bg-card"
                  />
                  {/* The unit lives inside the field: a bare number beside a
                      floating "DT" reads as two things to fill in. */}
                  <div className="relative">
                    <Input
                      value={String(t.amount)}
                      onChange={(e) =>
                        setTariffs((ts) =>
                          ts.map((x, j) =>
                            j === i ? { ...x, amount: Number(e.target.value.replace(/\D/g, "")) || 0 } : x,
                          ),
                        )
                      }
                      inputMode="numeric"
                      className="h-10 border-transparent bg-card pr-10 text-right tnum"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      DT
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Supprimer le tarif"
                    onClick={() => setTariffs((ts) => ts.filter((_, j) => j !== i))}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-fit gap-2"
                onClick={() => setTariffs((ts) => [...ts, { label: "", amount: 0, note: "" }])}
              >
                <Plus className="h-4 w-4" /> Ajouter un tarif
              </Button>
            </div>
          </Section>

          {/* ── Liaison avec l'application ──────────────────────────────── */}
          {pairing ? (
            <div id="liaison" className="scroll-mt-[calc(var(--app-header-h)+1.5rem)]">
              {pairing}
            </div>
          ) : null}
        </div>
      </div>

      {/* Sticky, because the page is taller than the screen and a save button
          that scrolls away is a save button people forget to press. It says
          when there is something to save. */}
      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t px-4 py-3 backdrop-blur transition-colors sm:-mx-6 sm:px-6",
          dirty ? "border-warn/30 bg-warn-soft/90" : "border-border/70 bg-background/85",
        )}
      >
        {dirty ? (
          <span className="mr-auto flex items-center gap-2 text-sm font-medium text-warn-foreground">
            <span className="h-2 w-2 rounded-full bg-warn" />
            Modifications non enregistrées
          </span>
        ) : (
          <span className="mr-auto text-sm text-muted-foreground">Tout est enregistré.</span>
        )}
        {dirty ? (
          <Button variant="ghost" onClick={resetAll} disabled={saving}>
            Annuler les modifications
          </Button>
        ) : null}
        <Button onClick={save} disabled={saving || !dirty} className="min-w-44 gap-2 shadow-card">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "identite", label: "Identité", icon: UserRound },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "localisation", label: "Localisation", icon: MapPin },
  { id: "horaires", label: "Horaires", icon: Clock },
  { id: "tarifs", label: "Tarifs", icon: Wallet },
  { id: "liaison", label: "Liaison application", icon: Link2 },
] as const;

/** The section nearest the top of the screen, for highlighting the menu. */
function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);
  return active;
}

function Section({
  id,
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** One line saying where this ends up, so the field labels can stay short. */
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-[calc(var(--app-header-h)+1.5rem)] rounded-2xl border border-border/70 bg-card shadow-card"
    >
      <header className="flex items-start gap-3 border-b border-border/60 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.95rem] font-semibold leading-tight text-foreground">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-6">{children}</div>
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
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** A small on/off switch for "open this day". */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
