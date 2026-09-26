import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * An establishment's rating, as read-only stars.
 *
 * Renders nothing at all when there are no ratings. An unrated practice is not
 * a bad one, and a row of five empty stars says otherwise to anyone skimming —
 * which, on a directory where most entries are new, would quietly punish every
 * establishment for the platform's own age.
 *
 * The count is always shown next to the average, because "4,8" from two visits
 * and "4,8" from two hundred are not the same claim and the reader is entitled
 * to tell them apart.
 */
export function RatingStars({
  average,
  count,
  size = "sm",
  className,
}: {
  average: number | null;
  count: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (average === null || count < 1) return null;

  const big = size === "lg";
  const star = big ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      // One label for assistive tech; the stars themselves are decoration and
      // are hidden below, so nothing reads out "star star star star star".
      aria-label={`${average.toFixed(1).replace(".", ",")} sur 5, ${count} avis`}
    >
      <span aria-hidden className="inline-flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              star,
              // Half a star rounds up to filled: at this size a half glyph is
              // indistinguishable from a full one anyway, and inventing a
              // clipped SVG for it costs more than it tells anybody.
              i <= Math.round(average)
                ? "fill-warn-foreground text-warn-foreground"
                : "text-muted-foreground/35",
            )}
          />
        ))}
      </span>

      <span
        aria-hidden
        className={cn(
          "font-mono tnum text-muted-foreground",
          big ? "text-[0.8rem]" : "text-[0.72rem]",
        )}
      >
        <span className="font-bold text-foreground">
          {average.toFixed(1).replace(".", ",")}
        </span>{" "}
        ({count})
      </span>
    </span>
  );
}
