"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
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

  const [profile, setProfile] = useState({
    title: doctor.title,
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card bg-mesh px-6 py-5 shadow-card">
        <div className="flex items-center gap-3">
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
              {published ? "Profil visible en ligne" : "Profil non publié"}
            </p>
            <p className="text-sm text-muted-foreground">
              {published
                ? "Les patients peuvent le voir et demander un rendez-vous."
                : "Invisible pour les patients tant qu'il n'est pas publié."}
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
        <Card icon={UserRound} title="Identité" className="xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Row label="Titre">
              <Input
                value={profile.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Dr"
              />
            </Row>
            <Row label="Nom complet" required>
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
            <Row label="Photo (URL)">
              <Input
                value={profile.photo_url}
                onChange={(e) => setField("photo_url", e.target.value)}
                placeholder="https://…"
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

        <Card icon={Wallet} title="Contact">
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

        <Card icon={MapPin} title="Localisation">
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

        <Card icon={Clock} title="Horaires de consultation" className="xl:col-span-2">
          <ul className="flex flex-col divide-y">
            {DAY_LABELS.map((label, i) => {
              const day = days[i];
              return (
                <li
                  key={label}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <button
                    type="button"
                    onClick={() => setDay(i, { open: !day.open })}
                    className={cn(
                      "h-8 w-24 shrink-0 rounded-lg text-xs font-semibold transition-colors",
                      day.open
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>

                  {day.open ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {day.ranges.map((r, k) => (
                        <span key={k} className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={r[0]}
                            onChange={(e) => setRange(i, k, 0, e.target.value)}
                            className="h-9 w-[6.5rem] tnum"
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={r[1]}
                            onChange={(e) => setRange(i, k, 1, e.target.value)}
                            className="h-9 w-[6.5rem] tnum"
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
                              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
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
                    <span className="text-sm text-muted-foreground">Fermé</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card icon={Wallet} title="Tarifs">
          <div className="flex flex-col gap-3">
            {tariffs.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
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
                  className="flex-1"
                />
                <Input
                  value={String(t.amount)}
                  onChange={(e) =>
                    setTariffs((ts) =>
                      ts.map((x, j) =>
                        j === i
                          ? { ...x, amount: Number(e.target.value.replace(/\D/g, "")) || 0 }
                          : x,
                      ),
                    )
                  }
                  inputMode="numeric"
                  className="w-20 tnum"
                />
                <span className="text-sm text-muted-foreground">DT</span>
                <button
                  type="button"
                  aria-label="Supprimer le tarif"
                  onClick={() => setTariffs((ts) => ts.filter((_, j) => j !== i))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
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

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={saving} className="w-full sm:w-48">
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
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-6 shadow-card", className)}
    >
      <h2 className="mb-5 flex items-center gap-2 text-[0.95rem] font-semibold text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
