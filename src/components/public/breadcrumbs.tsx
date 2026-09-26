import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  /** Omitted on the last one: you are already there. */
  href?: string;
};

/**
 * Where this page sits in the annuaire.
 *
 * Each step is a real query the visitor can widen to — "Médecins",
 * "Diabétologie" — rather than a decorative path, so arriving on a profile
 * from a search engine still offers a way into the directory instead of a
 * dead end.
 *
 * `<ol>` with `aria-current` on the last entry: the order is the meaning
 * here, and a screen reader should be able to say which one you are on.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.78rem]">
        {items.map((item, i) => {
          const last = i === items.length - 1;

          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/45"
                />
              ) : null}

              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="font-semibold text-muted-foreground transition-colors duration-base hover:text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "font-semibold",
                    last ? "text-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
