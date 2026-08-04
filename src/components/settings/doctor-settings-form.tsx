"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  ImageOff,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { osmEmbedUrl, parseLatLng } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { DAY_LABELS, type DayHours, type Doctor, type Tariff } from "@/types";

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

export function DoctorSettingsForm({ doctor }: { doctor: Doctor }) {
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
  const [days, setDays] = useState<DayForm[]>(() => toDayForms(doctor.hours));
  const [tariffs, setTariffs] = useState<Tariff[]>(doctor.tariffs);
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

  async function save() {
    if (!profile.full_name.trim()) {
      toast.error("Le nom du médecin est obligatoire.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("doctors")
      .update({
        ...profile,
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
    toast.success("Profil enregistré.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Publication state reads as the headline, because it decides whether
          any of the rest is visible to patients at all. */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-5 shadow-card transition-colors",
          // The border carries the state, so the answer to "is this live?" is
          // legible from the edge of the screen without reading a word.
          published
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-border/70 bg-card bg-mesh",
        )}
      >
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              published
                ? "bg-emerald-100 text-emerald-700"
                : "bg-secondary text-muted-foreground",
            )}
          >
            {published ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </span>
          <div>
            <p className="font-semibold text-foreground">
              {published ? "Détails visibles en ligne" : "Détails non publiés"}
            </p>
            <p className="text-sm text-muted-foreground">
              {published
                ? "Les patients peuvent les consulter et demander un rendez-vous."
                : "Invisibles pour les patients tant qu'ils ne sont pas publiés."}
            </p>
          </div>
        </div>
        <Button
          variant={published ? "outline" : "default"}
          onClick={() => setPublished((v) => !v)}
        >
          {published ? "Dépublier" : "Publier"}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card
          icon={UserRound}
          title="Identité"
          hint="Le nom et la photo en tête de la page."
          className="xl:col-span-2"
        >
          {/* Photo beside the fields it is built from, so a wrong URL shows as a
              broken face rather than as a string that looks fine. */}
          <div className="mb-5 flex items-center gap-4 rounded-xl border border-border/60 bg-muted/25 p-3.5">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl border border-border/60 bg-card object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card text-muted-foreground">
                <ImageOff className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Row label="Photo (URL)">
                <Input
                  value={profile.photo_url}
                  onChange={(e) => setField("photo_url", e.target.value)}
                  placeholder="https://…"
                />
              </Row>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Nom complet">
              <Input
                value={profile.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
              />
            </Row>
            <Row label="Spécialité">
              <Input
                value={profile.specialty}
                onChange={(e) => setField("specialty", e.target.value)}
                placeholder="Médecine générale"
              />
            </Row>
            <div className="sm:col-span-2">
              <Row label="Présentation">
                <textarea
                  value={profile.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-[0.95rem] shadow-inner-sm transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:shadow-glow focus-visible:outline-none"
                  placeholder="Quelques lignes présentées aux patients."
                />
              </Row>
            </div>
          </div>
        </Card>

        <Card icon={Phone} title="Contact" hint="Comment le cabinet est joignable.">
          <div className="flex flex-col gap-4">
            <Row label="Téléphone">
              <Input
                value={profile.phone}
                onChange={(e) => setField("phone", e.target.value)}
                inputMode="tel"
                className="tnum"
              />
            </Row>
            <Row label="Email">
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Row>
            <Row label="Adresse">
              <Input
                value={profile.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </Row>
            <Row label="Ville">
              <Input
                value={profile.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </Row>
          </div>
        </Card>

        <Card
          icon={Clock}
          title="Horaires de consultation"
          hint="Préciser ici les hauraires de votre médecin"
          className="xl:col-span-2"
        >
          <ul className="flex flex-col divide-y divide-border/60">
            {DAY_LABELS.map((label, i) => {
              const day = days[i];
              return (
                <li
                  key={label}
                  className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => setDay(i, { open: !day.open })}
                    aria-pressed={day.open}
                    className={cn(
                      "h-9 w-28 shrink-0 rounded-lg text-xs font-semibold capitalize transition-colors",
                      day.open
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                    )}
                  >
                    {label}
                  </button>

                  {day.open ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {day.ranges.map((r, k) => (
                        <span
                          key={k}
                          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/25 px-1.5 py-1"
                        >
                          <Input
                            type="time"
                            value={r[0]}
                            onChange={(e) => setRange(i, k, 0, e.target.value)}
                            className="h-9 w-[8.25rem] border-transparent bg-card px-2.5 tnum"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={r[1]}
                            onChange={(e) => setRange(i, k, 1, e.target.value)}
                            className="h-9 w-[8.25rem] border-transparent bg-card px-2.5 tnum"
                          />
                          {day.ranges.length > 1 ? (
                            <button
                              type="button"
                              aria-label="Supprimer la plage"
                              onClick={() =>
                                setDay(i, {
                                  ranges: day.ranges.filter((_, j) => j !== k),
                                })
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
                          onClick={() =>
                            setDay(i, {
                              ranges: [...day.ranges, ["15:00", "18:00"]],
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5" /> Après-midi
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
        </Card>

        <Card
          icon={MapPin}
          title="Localisation"
          hint="Emplacement du cabinet"
          
        >
          <div className="flex flex-col gap-4">
            <Row label="Lien Google Maps ou coordonnées">
              <Input
                value={mapInput}
                onChange={(e) => onMapInput(e.target.value)}
                placeholder="Collez le lien Maps, ou 36.8065, 10.1815"
              />
            </Row>

            {coordsError ? (
              <p className="text-xs text-destructive">{coordsError}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Row label="Latitude">
                <Input
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    setCoordsError(null);
                  }}
                  inputMode="decimal"
                  className="tnum"
                />
              </Row>
              <Row label="Longitude">
                <Input
                  value={lng}
                  onChange={(e) => {
                    setLng(e.target.value);
                    setCoordsError(null);
                  }}
                  inputMode="decimal"
                  className="tnum"
                />
              </Row>
            </div>

            {preview ? (
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  src={osmEmbedUrl(preview)}
                  title="Aperçu de la localisation"
                  loading="lazy"
                  className="h-40 w-full border-0"
                />
              </div>
            ) : (
              <p className="rounded-xl bg-secondary px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                Ouvrez Google Maps, faites un clic droit sur le cabinet →
                « Copier les coordonnées », puis collez-les ci-dessus. Un lien
                court (maps.app.goo.gl) ne contient pas les coordonnées :
                ouvrez-le d&apos;abord, puis copiez l&apos;adresse complète.
              </p>
            )}
          </div>
        </Card>

        <Card
          icon={Wallet}
          title="Tarifs"
          hint="Préciser ici les Tarifs de votre médecin"
          // Spans the row so the five cards close out three exact rows
          // (2+1, 2+1, 3) instead of leaving two empty cells at the bottom.
          className="xl:col-span-3"
        >
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {tariffs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/25 px-3.5 py-6 text-center text-xs text-muted-foreground sm:col-span-2 xl:col-span-3">
                Aucun tarif affiché aux patients.
              </p>
            ) : null}

            {tariffs.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/25 p-1.5"
              >
                <Input
                  value={t.label}
                  onChange={(e) =>
                    setTariffs((ts) =>
                      ts.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                  placeholder="Consultation"
                  className="h-9 flex-1 border-transparent bg-card"
                />
                {/* The unit lives inside the field: a bare number beside a
                    floating "DT" reads as two things to fill in. */}
                <div className="relative w-24 shrink-0">
                  <Input
                    value={String(t.amount)}
                    onChange={(e) =>
                      setTariffs((ts) =>
                        ts.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                amount:
                                  Number(e.target.value.replace(/\D/g, "")) || 0,
                              }
                            : x,
                        ),
                      )
                    }
                    inputMode="numeric"
                    className="h-9 border-transparent bg-card pr-9 text-right tnum"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    DT
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer le tarif"
                  onClick={() => setTariffs((ts) => ts.filter((_, j) => j !== i))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                setTariffs((ts) => [...ts, { label: "", amount: 0, note: "" }])
              }
            >
              <Plus className="h-4 w-4" /> Ajouter un tarif
            </Button>
          </div>
        </Card>
      </div>

      {/* Sticky, because this form is taller than the screen and a save button
          that scrolls away is a save button people forget to press. */}
      <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-end gap-4 border-t border-border/70 bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button
          size="lg"
          onClick={save}
          disabled={saving}
          className="w-full gap-2 shadow-card sm:w-48"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  hint,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** One line saying where this ends up, so the field labels can stay short. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border/70 bg-card shadow-card",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-6 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-semibold leading-tight text-foreground">
            {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </section>
  );
}

function Row({
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
