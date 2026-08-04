"use client";

import { cn } from "@/lib/utils";
import { STATUS_META, STATUS_ORDER } from "@/lib/scheduler";

/**
 * The key to the calendar's colours.
 *
 * Swatches rather than dots, and cut from the same classes the appointment
 * blocks use: a legend works by looking like the thing it explains, and a plain
 * coloured dot shares nothing with a bordered pastel block except a hue.
 */
export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 rounded-xl border border-border/60 bg-card/60 px-3.5 py-2">
      <span className="mr-auto text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Statuts
      </span>
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        return (
          <span
            key={s}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
          >
            <span
              className={cn(
                "h-3.5 w-6 rounded-[5px] border",
                // Only the surface and border — the hover states the blocks
                // carry would be noise on something you cannot click.
                meta.block.split(" ").filter((c) => !c.startsWith("hover:")).join(" "),
              )}
            />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
