import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Stethoscope,
  Wallet,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { AvailabilityGrid } from "@/components/public/availability-grid";
import { getDoctorBySlug } from "@/lib/doctors";
import { initials } from "@/lib/avatar";
import { directionsUrl, osmEmbedUrl } from "@/lib/geo";
import type { DayHours } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const doctor = await getDoctorBySlug(params.slug);
  if (!doctor) return { title: "Médecin introuvable — DoctorY" };
  const name = `${doctor.title} ${doctor.full_name}`.trim();
  return {
    title: `${name} — DoctorY`,
    description:
      doctor.bio ||
      `${name}${doctor.specialty ? ` · ${doctor.specialty}` : ""}. Horaires de consultation et demande de rendez-vous.`,
  };
}

export default async function DoctorPage({
  params,
}: {
  params: { slug: string };
}) {
  const doctor = await getDoctorBySlug(params.slug);

  // An unpublished profile is invisible to visitors: RLS returns nothing, so
  // this is a genuine 404 rather than a "forbidden" that confirms it exists.
  if (!doctor || !doctor.is_published) notFound();

  const name = `${doctor.title} ${doctor.full_name}`.trim();
  const place = [doctor.address, doctor.city].filter(Boolean).join(", ");
  const coords =
    doctor.latitude !== null && doctor.longitude !== null
      ? { lat: doctor.latitude, lng: doctor.longitude }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Identity band */}
        <div className="relative overflow-hidden border-b border-slate-100">
          <div className="absolute inset-0 bg-mesh opacity-70" />
          <div className="relative mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-5 px-4 py-8 sm:px-6 lg:px-8">
            {doctor.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doctor.photo_url}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-xl font-semibold text-teal-700 shadow-sm">
                {initials(doctor.full_name, "") || "Dr"}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {name}
              </h1>
              {doctor.specialty ? (
                <p className="mt-1.5 flex items-center gap-2 text-teal-700">
                  <Stethoscope className="h-4 w-4" />
                  {doctor.specialty}
                </p>
              ) : null}
              {place ? (
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {place}
                </p>
              ) : null}
            </div>

            <a
              href="#creneaux"
              className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-6 font-semibold text-white shadow-lg shadow-teal-600/20 transition-colors hover:bg-teal-700"
            >
              <CalendarPlus className="h-[1.15rem] w-[1.15rem]" />
              Choisir un créneau
            </a>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[1600px] items-start gap-5 px-4 py-8 sm:px-6 lg:px-8 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            {doctor.bio ? (
              <Panel title="À propos">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {doctor.bio}
                </p>
              </Panel>
            ) : null}

            <div id="creneaux" className="scroll-mt-24">
              <Panel icon={CalendarDays} title="Choisir un créneau">
                <AvailabilityGrid slug={doctor.slug} />
              </Panel>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {doctor.tariffs.length > 0 ? (
              <Panel icon={Wallet} title="Tarifs">
                <ul className="flex flex-col divide-y divide-slate-100">
                  {doctor.tariffs.map((t, i) => (
                    <li
                      key={`${t.label}-${i}`}
                      className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-slate-700">
                          {t.label}
                        </span>
                        {t.note ? (
                          <span className="block text-xs text-slate-400">
                            {t.note}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        {t.amount} DT
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
                  Tarifs indicatifs, à confirmer avec le secrétariat.
                </p>
              </Panel>
            ) : null}

            {doctor.phone || doctor.email || place ? (
              <Panel title="Contact">
                <ul className="flex flex-col gap-3 text-sm">
                  {doctor.phone ? (
                    <li className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`tel:${doctor.phone}`}
                        className="tabular-nums hover:text-teal-700"
                      >
                        {doctor.phone}
                      </a>
                    </li>
                  ) : null}
                  {doctor.email ? (
                    <li className="flex items-center gap-2.5 text-slate-600">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <a
                        href={`mailto:${doctor.email}`}
                        className="truncate hover:text-teal-700"
                      >
                        {doctor.email}
                      </a>
                    </li>
                  ) : null}
                  {place ? (
                    <li className="flex items-start gap-2.5 text-slate-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      {place}
                    </li>
                  ) : null}
                </ul>
              </Panel>
            ) : null}

            {coords ? (
              <Panel icon={MapPin} title="Localisation">
                {/* OpenStreetMap: no API key, no billing account, no tracking
                    script loaded into the patient's browser. */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <iframe
                    src={osmEmbedUrl(coords)}
                    title={`Localisation de ${name}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-56 w-full border-0"
                  />
                </div>

                <a
                  href={directionsUrl(coords)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                >
                  <Navigation className="h-4 w-4" />
                  Itinéraire
                </a>

                <OpeningHours hours={doctor.hours} />
              </Panel>
            ) : doctor.hours.length > 0 ? (
              // No map to sit under, so the hours get their own panel.
              <Panel icon={Clock} title="Horaires">
                <OpeningHours hours={doctor.hours} bare />
              </Panel>
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

const SHORT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Weekly hours in as few lines as possible: consecutive days with identical
 * ranges collapse into one row, so a normal practice reads as three lines
 * ("Lun – Ven", "Sam", "Dim") instead of seven.
 */
function groupHours(hours: DayHours[]): { label: string; value: string }[] {
  const valueFor = (day: number) => {
    const ranges = hours.find((h) => h.day === day)?.ranges ?? [];
    return ranges.length
      ? ranges.map(([a, b]) => `${a} – ${b}`).join(", ")
      : "Fermé";
  };

  const rows: { label: string; value: string }[] = [];
  let start = 1;

  for (let day = 1; day <= 7; day++) {
    const current = valueFor(day);
    const next = day < 7 ? valueFor(day + 1) : null;
    if (current !== next) {
      rows.push({
        label:
          start === day
            ? SHORT_DAYS[start - 1]
            : `${SHORT_DAYS[start - 1]} – ${SHORT_DAYS[day - 1]}`,
        value: current,
      });
      start = day + 1;
    }
  }
  return rows;
}

function OpeningHours({
  hours,
  bare = false,
}: {
  hours: DayHours[];
  bare?: boolean;
}) {
  const rows = groupHours(hours);
  if (rows.length === 0) return null;

  return (
    <dl className={bare ? "" : "mt-4 border-t border-slate-100 pt-3"}>
      {!bare ? (
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Clock className="h-3 w-3" />
          Horaires
        </p>
      ) : null}

      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-3 py-0.5 text-sm"
        >
          <dt className="shrink-0 text-slate-500">{r.label}</dt>
          <dd
            className={`truncate tabular-nums ${
              r.value === "Fermé" ? "text-slate-400" : "text-slate-700"
            }`}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
        {Icon ? <Icon className="h-[1.05rem] w-[1.05rem] text-slate-400" /> : null}
        {title}
      </h2>
      {children}
    </section>
  );
}
