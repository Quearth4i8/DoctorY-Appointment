"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A third-party map that loads only once the visitor asks for it.
 *
 * The Google embed can set its own cookies as soon as it loads. Holding it
 * behind one click means a visitor who never looks at the map never talks to
 * Google, and the site needs no cookie banner: everything else it sets is
 * strictly necessary (see /confidentialite#cookies).
 */
export function ClickToLoadMap({
  src,
  title,
  provider = "Google Maps",
  className,
}: {
  src: string;
  title: string;
  /** Named on the placeholder, so the visitor knows who they are loading. */
  provider?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        title={title}
        src={src}
        className={cn("block w-full border-0", className)}
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden bg-paper-muted text-center transition-colors hover:bg-accent/40",
        className,
      )}
    >
      {/* A faint street grid, so the placeholder reads as "a map goes here". */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-card transition-transform duration-base ease-spring group-hover:scale-110">
        <MapPinned className="h-5 w-5" />
      </span>
      <span className="relative text-sm font-bold">Afficher la carte</span>
      <span className="relative max-w-[16rem] text-[0.7rem] leading-snug text-muted-foreground">
        La carte est fournie par {provider}, qui peut déposer ses propres cookies.
      </span>
    </button>
  );
}
