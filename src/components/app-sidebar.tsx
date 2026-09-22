"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Users,
  X,
} from "lucide-react";

import { fetchRequests } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "doctory_web_sidebar_collapsed";

const LINKS = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/demandes", label: "Demandes", icon: Inbox, counted: true },
] as const;

/**
 * The console's navigation rail.
 *
 * Dark in both themes — it is the edge of the window, not a panel, and that is
 * what separates the working tool from the public annuaire at a glance.
 * Collapses to a 64px icon rail rather than hiding, matching the desktop app
 * so a secretary who uses both finds the same control in the same place.
 */
export function AppSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  // Always false on first render, matching the server (which has no
  // localStorage) — reading the stored value here instead would make the
  // client's first render disagree with the server-rendered HTML, which is
  // a hydration error, not just a visual flash. Applying it in an effect
  // defers the change to after hydration completes.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Private browsing, quota exceeded — stays expanded for this session.
    }
  }, []);

  /*
   * How many requests are still waiting.
   *
   * Deliberately the SAME query key the inbox uses, so the two share one cache
   * entry: opening /demandes costs no extra request, and answering one updates
   * the badge without a refetch.
   */
  const { data: pending = [] } = useQuery({
    queryKey: ["requests", "en_attente"],
    queryFn: () => fetchRequests("en_attente"),
    refetchInterval: 60_000,
    // A badge is not worth an error state; a stale count beats a broken rail.
    retry: false,
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Private browsing, quota exceeded — the toggle still works this session.
      }
      return next;
    });
  };

  return (
    <>
      {mobileOpen ? (
        <div
          aria-hidden
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-rail/40 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[15rem] flex-col bg-rail transition-all duration-200",
          "md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0",
          collapsed && "md:w-16",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand — collapsed state drops the separate toggle button (logo +
            chevron never both fit at 64px) and makes the whole row the
            expand control instead. */}
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Développer"
            className="hidden h-16 shrink-0 items-center justify-center transition-colors hover:bg-rail-raised md:flex"
          >
            <Image
              src="/logo-doctory.png"
              alt="DoctorY"
              width={36}
              height={36}
              className="h-8 w-8 rounded-[0.625rem] object-cover"
            />
          </button>
        ) : (
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-3.5">
            <Link
              href="/agenda"
              onClick={onMobileClose}
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <Image
                src="/logo-doctory.png"
                alt="DoctorY"
                width={36}
                height={36}
                priority
                className="h-8 w-8 shrink-0 rounded-[0.625rem] object-cover"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold tracking-tight text-rail-foreground">
                  DoctorY
                </span>
                <span className="truncate text-[0.65rem] text-rail-muted">
                  Secrétariat
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Réduire"
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-foreground md:flex"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fermer le menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rail-muted hover:bg-rail-raised md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav
          className={cn(
            "flex flex-1 flex-col gap-0.5 overflow-y-auto py-2",
            collapsed ? "px-2" : "px-3",
          )}
        >
          {LINKS.map(({ href, label, icon: Icon, ...rest }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const count =
              "counted" in rest && rest.counted ? pending.length : 0;

            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-10 items-center gap-2.5 rounded-[0.625rem] text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-2.5",
                  active
                    ? "bg-primary font-bold text-primary-foreground"
                    : "font-medium text-rail-muted hover:bg-rail-raised hover:text-rail-foreground",
                )}
              >
                <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
                {!collapsed ? <span className="flex-1">{label}</span> : null}

                {count > 0 ? (
                  collapsed ? (
                    // At 64px there is no room for a number, but "there is
                    // something waiting" still has to get through.
                    <span
                      aria-label={`${count} demandes en attente`}
                      className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warn ring-2 ring-rail"
                    />
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] font-bold tnum",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-warn-soft text-warn-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )
                ) : null}
              </Link>
            );
          })}
        </nav>

        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Développer"
            className="hidden h-12 shrink-0 items-center justify-center border-t border-rail-border text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-foreground md:flex"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="shrink-0 px-3 pb-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-[0.625rem] border border-rail-border px-3 py-2 text-[0.72rem] font-semibold text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-foreground"
            >
              Voir le site public
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
