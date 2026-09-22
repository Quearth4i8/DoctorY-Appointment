import type { Metadata } from "next";
import Link from "next/link";
import { Cross, MapPin, Moon, Phone } from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { listOnDutyPharmacies } from "@/lib/providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pharmacies de garde",
  description:
    "Les pharmacies de garde ouvertes en ce moment : adresse, horaires de garde, téléphone et itinéraire.",
};

/**
 * Who is open right now.
 *
 * Built for one situation: it is late, someone needs a pharmacy, and they are
 * on a phone. So the page answers in its first line, lists nothing but what
 * gets you there, and puts the two actions that matter — call, directions —
 * as full targets rather than icons.
 */
export default async function GardesPage() {
  const now = new Date();
  const pharmacies = await listOnDutyPharmacies(undefined, now, 50);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="bg-foreground text-background">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
            <Moon className="h-3.5 w-3.5" />
            {formatNight(now)}
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.025em]">
            Pharmacies de garde
          </h1>
          <p className="mt-2 text-background/70">
            {pharmacies.length > 0
              ? `${pharmacies.length} pharmacie${pharmacies.length > 1 ? "s" : ""} ouverte${pharmacies.length > 1 ? "s" : ""} en ce moment.`
              : "Aucun tour de garde n'est enregistré pour cette période."}
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {pharmacies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-warm bg-card px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Cross className="h-6 w-6" />
            </span>
            <p className="text-base font-bold">Pas encore de tour de garde ici</p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Les rosters sont publiés région par région. En attendant, vous
              pouvez voir toutes les pharmacies de l&apos;annuaire et leurs
              horaires habituels.
            </p>
            <Link
              href="/recherche?kind=pharmacie"
              className="mt-2 inline-flex h-10 items-center rounded-xl border border-input bg-card px-4 text-sm font-bold transition-colors hover:bg-paper-muted"
            >
              Voir les pharmacies
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pharmacies.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-4 rounded-2xl border border-border-warm bg-card p-5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-foreground">
                    <Cross className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/etablissement/${p.slug}`}
                      className="block truncate text-[0.95rem] font-bold hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">
                        {[p.address, p.city].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs font-extrabold text-background">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {untilLabel(p.on_duty_until)}
                </span>

                <div className="flex gap-2">
                  <Link
                    href={directionsUrl(p.address, p.city, p.latitude, p.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
                  >
                    <MapPin className="h-4 w-4" />
                    Itinéraire
                  </Link>
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone.replace(/\s/g, "")}`}
                      aria-label={`Appeler ${p.name}`}
                      className="inline-flex h-11 w-[3.25rem] items-center justify-center rounded-xl border border-input bg-card transition-colors hover:bg-paper-muted"
                    >
                      <Phone className="h-[1.05rem] w-[1.05rem]" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}

/** "Nuit du lundi 21 au mardi 22 septembre" — or the day, before evening. */
function formatNight(now: Date): string {
  const day = (d: Date) =>
    d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
  const month = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long" });

  // Before 08:00 the "night" being served started yesterday evening, so the
  // label has to look backwards or it names the wrong pair of days.
  const start = new Date(now);
  if (now.getHours() < 8) start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return `Nuit du ${day(start)} au ${day(end)} ${month(end)}`;
}

function untilLabel(until: string | null): string {
  if (!until) return "De garde";
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return "De garde";
  const hh = String(end.getHours()).padStart(2, "0");
  const mm = String(end.getMinutes()).padStart(2, "0");
  return `De garde jusqu'à ${hh}:${mm}`;
}

/**
 * Coordinates when we have them, the written address when we do not.
 *
 * A pin is exact and an address is a guess the maps app makes, but an address
 * that resolves is better than a pin at (null, null) — which silently opens
 * the middle of the ocean.
 */
function directionsUrl(
  address: string,
  city: string,
  lat: number | null,
  lng: number | null,
): string {
  const target =
    lat !== null && lng !== null
      ? `${lat},${lng}`
      : [address, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
}
