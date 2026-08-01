import { cn } from "@/lib/utils";

/** Shimmering placeholder used while a list is loading. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(var(--secondary))_37%,hsl(var(--muted))_63%)]",
        className,
      )}
      {...props}
    />
  );
}
