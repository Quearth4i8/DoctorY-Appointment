"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The site's own sections — not its content.
 *
 * The twelve trades used to sit here. They are catalogue entries, and a
 * catalogue does not belong in a navbar: it repeated the filter rail on the
 * results page, it could only ever show four of the twelve, and it grew every
 * time a trade was added. They live on /annuaire now, where there is room for
 * all of them with a line of explanation each.
 *
 * What is left is pathname-only, which is why there is no `useSearchParams`
 * here any more — and so no Suspense boundary needed to keep static pages
 * static.
 */

type NavItem = {
  href: string;
  label: string;
  /** Extra paths that count as "inside" this section. */
  also?: string[];
};

const NAV: NavItem[] = [
  { href: "/", label: "Accueil" },
  // Search and profiles are the annuaire being used, so they keep it lit
  // rather than leaving the reader with nothing marked mid-journey.
  { href: "/annuaire", label: "Annuaire", also: ["/recherche", "/etablissement"] },
  { href: "/gardes", label: "Gardes" },
  { href: "/a-propos", label: "À propos" },
];

function matches(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  const paths = [item.href, ...(item.also ?? [])];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {NAV.map((item) => {
        const active = matches(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-[0.625rem] px-3 py-2 text-sm transition-colors duration-base",
              active
                ? "bg-accent font-bold text-accent-foreground"
                : "font-medium text-muted-foreground hover:bg-paper-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
