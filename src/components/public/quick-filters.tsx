"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Clock, LoaderCircle, Navigation, UserPlus, X } from "lucide-react";

import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * The fast lane, directly under the search box.
 *
 * Someone who needs a doctor in the next hour should not have to read a
 * twelve-entry taxonomy in a sidebar to get moving. These are the three
 * questions that actually narrow "I need help now" — where am I, who is open,
 * who will take me — plus the trades that have anything in them, as one row
 * of thumb-sized chips.
 *
 * Nothing here is new capability: every chip writes the same URL parameters
 * the filter rail already owns, so the rail stays the complete view and this
 * is the shortcut. `Autour de moi` is the exception — the search has always
 * been able to sort by distance, but until now no screen ever supplied a
 * position for it to sort from.
 */

/** Offered after a position is known. Metres are false precision on foot. */
const RADII = [2, 5, 15] as const;
const DEFAULT_RADIUS = 5;

export function QuickFilters({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const near = params.get("lat") !== null && params.get("lng") !== null;
  const radius = Number(params.get("rayon")) || DEFAULT_RADIUS;

  const toggleFlag = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      if (next.get(key) === "1") next.delete(key);
      else next.set(key, "1");
      push(next);
    },
    [params, push],
  );

  /** One trade at a time here; the rail is where several can be combined. */
  const pickKind = useCallback(
    (kind: string | null) => {
      const next = new URLSearchParams(params.toString());
      next.delete("kind");
      if (kind) next.set("kind", kind);
      push(next);
    },
    [params, push],
  );

  const clearNear = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("lat");
    next.delete("lng");
    next.delete("rayon");
    push(next);
  }, [params, push]);

  const setRadius = useCallback(
    (km: number) => {
      const next = new URLSearchParams(params.toString());
      next.set("rayon", String(km));
      push(next);
    },
    [params, push],
  );

  function locate() {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Votre navigateur ne sait pas donner votre position.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(params.toString());
        // Five decimals is about a metre — more would just make the URL
        // uglier and the position no truer.
        next.set("lat", pos.coords.latitude.toFixed(5));
        next.set("lng", pos.coords.longitude.toFixed(5));
        if (!next.get("rayon")) next.set("rayon", String(DEFAULT_RADIUS));
        setLocating(false);
        push(next);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Autorisez la localisation dans votre navigateur, puis réessayez."
            : "Position indisponible pour le moment.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const activeKind = params.get("kind");
  // Trades with nothing in them are noise in a shortcut row — the rail still
  // lists all twelve, with their zeroes.
  const kindsWithResults = KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0).slice(0, 5);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {near ? (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary pl-4 pr-1.5 text-[0.85rem] font-bold text-primary-foreground">
            <Navigation className="h-4 w-4" />
            Autour de moi
            <button
              type="button"
              onClick={clearNear}
              aria-label="Ne plus trier par distance"
              className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[0.85rem] font-bold text-background transition-all duration-base hover:brightness-125 disabled:opacity-70"
          >
            {locating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {locating ? "Localisation…" : "Autour de moi"}
          </button>
        )}

        <Chip
          on={params.get("ouvert") === "1"}
          onClick={() => toggleFlag("ouvert")}
          icon={Clock}
        >
          Ouvert maintenant
        </Chip>

        <Chip
          on={params.get("nouveaux") === "1"}
          onClick={() => toggleFlag("nouveaux")}
          icon={UserPlus}
        >
          Prend de nouveaux patients
        </Chip>

        {kindsWithResults.length > 1 ? (
          <>
            <span aria-hidden className="mx-1 hidden h-6 w-px bg-border-warm sm:block" />
            <Chip on={!activeKind} onClick={() => pickKind(null)}>
              Tout
            </Chip>
            {kindsWithResults.map((kind) => {
              const meta = kindMeta(kind as ProviderKind);
              return (
                <Chip
                  key={kind}
                  on={activeKind === kind}
                  onClick={() => pickKind(kind)}
                  icon={meta.Icon}
                >
                  {meta.plural}
                </Chip>
              );
            })}
          </>
        ) : null}
      </div>

      {near ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] font-semibold text-muted-foreground">
            Dans un rayon de
          </span>
          {RADII.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={radius === km}
              onClick={() => setRadius(km)}
              className={cn(
                "inline-flex h-7 items-center rounded-full px-2.5 font-mono text-[0.72rem] font-bold tnum transition-colors duration-base",
                radius === km
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-paper-muted",
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      ) : null}

      {geoError ? (
        <p role="status" className="text-[0.78rem] font-semibold text-warn-foreground">
          {geoError}
        </p>
      ) : null}
    </div>
  );
}

function Chip({
  on,
  onClick,
  icon: Icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[0.85rem] transition-colors duration-base",
        on
          ? "border-primary bg-accent font-bold text-accent-foreground"
          : "border-border-warm bg-card font-semibold text-foreground/75 hover:bg-paper-muted",
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
