import Link from "next/link";
import { BadgeCheck, MapPin, Moon } from "lucide-react";

import { ProviderAvatar } from "@/components/public/provider-avatar";
import { kindMeta, primaryAction } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import { formatMillimes, type ProviderSummary } from "@/types";

/**
 * One establishment in a results list.
 *
 * The same card serves all twelve trades. What changes between a cardiologist
 * and a pharmacy is not the layout but three facts the row already carries:
 * the booking mode decides the action, the duty shift decides the status line,
 * and the cheapest service decides whether a price shows at all.
 */

function distanceLabel(km: number | null): string {
  if (km === null) return "";
  // Under a kilometre, "0,4 km" is harder to judge than "400 m"; over ten,
  // the decimal is noise.
  if (km < 1) return `${Math.round(km * 100) * 10} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

function dutyLabel(until: string | null): string | null {
  if (!until) return null;
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return null;
  const hh = String(end.getHours()).padStart(2, "0");
  const mm = String(end.getMinutes()).padStart(2, "0");
  return `De garde jusqu'à ${hh}:${mm}`;
}

export function ProviderCard({
  provider,
  /** Upcoming times, when the establishment publishes a live agenda. */
  slots = [],
}: {
  provider: ProviderSummary;
  slots?: string[];
}) {
  const meta = kindMeta(provider.kind);
  const action = primaryAction(provider.booking_mode);
  const duty = dutyLabel(provider.on_duty_until);
  const distance = distanceLabel(provider.distance_km);

  return (
    <Link
      href={`/etablissement/${provider.slug}`}
      className={cn(
        // `min-w-0` because this is a grid item, and a grid item refuses by
        // default to shrink below its min-content width — which the `truncate`
        // name below fixes at the full untruncated string, since truncation
        // implies `white-space: nowrap`. Without it the card pushes its track
        // wider than the phone and the whole page scrolls sideways.
        "group flex min-w-0 gap-4 rounded-xl border bg-card p-4 shadow-card",
        "transition-all duration-slow ease-spring",
        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lifted sm:p-5",
        provider.is_sponsored ? "border-primary/40" : "border-border-warm",
      )}
    >
      <ProviderAvatar
        photoUrl={provider.photo_url}
        kind={provider.kind}
        name={provider.name}
        className="h-14 w-14 rounded-xl"
        iconClassName="h-6 w-6"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-base font-bold tracking-tight">
            {provider.name}
          </span>

          {provider.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[0.65rem] font-extrabold text-info-foreground">
              <BadgeCheck className="h-3 w-3" />
              Vérifié
            </span>
          ) : null}

          <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold", meta.chip, meta.glyph)}>
            {meta.label}
          </span>

          {/* Paid placement is labelled, never disguised. An establishment
              only ever rises inside results it already matched. */}
          {provider.is_sponsored ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              Sponsorisé
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[0.8rem] text-muted-foreground">
          {provider.specialties.length > 0 ? (
            <span className="font-semibold text-primary">
              {provider.specialties.slice(0, 2).join(" · ")}
            </span>
          ) : null}

          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {[provider.address, provider.city].filter(Boolean).join(", ")}
            </span>
          </span>

          {distance ? (
            <span className="font-mono font-semibold text-foreground/70 tnum">{distance}</span>
          ) : null}

          {duty ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-info-foreground">
              <Moon className="h-3.5 w-3.5" />
              {duty}
            </span>
          ) : provider.open_24_7 ? (
            <span className="font-bold text-ok-foreground">Ouvert 24 h/24</span>
          ) : null}
        </div>

        {/* Slots in the list, not behind a click: the whole point of a live
            agenda is that the visitor can pick a time without opening the
            profile first. */}
        {slots.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs font-bold text-muted-foreground">
              Prochains créneaux
            </span>
            {slots.slice(0, 3).map((slot) => (
              <span
                key={slot}
                className="rounded-[0.625rem] border border-input bg-card px-3 py-1.5 font-mono text-xs font-semibold tnum"
              >
                {slot}
              </span>
            ))}
          </div>
        ) : provider.booking_mode === "aucune" ? (
          <p className="text-xs text-muted-foreground">Sans rendez-vous</p>
        ) : provider.booking_mode === "demande" ? (
          <p className="text-xs text-muted-foreground">
            Sur demande — l&apos;établissement vous rappelle
          </p>
        ) : null}
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-between gap-3 sm:flex">
        {provider.from_millimes !== null ? (
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              À partir de
            </span>
            <span className="font-mono text-[0.95rem] font-semibold tnum">
              {formatMillimes(provider.from_millimes)}
            </span>
          </span>
        ) : (
          <span />
        )}

        <span
          className={cn(
            "inline-flex h-9 items-center rounded-[0.625rem] px-4 text-[0.8rem] font-bold transition-colors",
            action.href === "book"
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          {action.label}
        </span>
      </div>
    </Link>
  );
}
