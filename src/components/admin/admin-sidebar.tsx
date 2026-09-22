"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "doctory_admin_sidebar_collapsed";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/demandes", label: "Demandes", icon: Inbox },
  { href: "/admin/etablissements", label: "Établissements", icon: Building2 },
  { href: "/admin/comptes", label: "Comptes", icon: Users },
  { href: "/admin/licences", label: "Licences", icon: KeyRound },
] as const;

export function AdminSidebar({
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
          className="fixed inset-0 z-40 bg-rail-admin/50 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[15rem] flex-col bg-rail-admin transition-all duration-200",
          "md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0",
          // The rail is its own viewport-tall sticky column; only its nav
          // scrolls, and only when there are more links than fit.
          collapsed && "md:w-16",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Développer"
            className="hidden h-16 shrink-0 items-center justify-center transition-colors hover:bg-rail-admin-raised md:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.625rem] bg-clay text-white">
              <ShieldCheck className="h-[1.05rem] w-[1.05rem]" />
            </span>
          </button>
        ) : (
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-clay text-white">
              <ShieldCheck className="h-[1.05rem] w-[1.05rem]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold tracking-tight text-rail-foreground">
                DoctorY
              </span>
              {/* Names the surface, not the person: the point is to know you
                  are outside any single cabinet. */}
              <span className="truncate text-[0.65rem] font-semibold text-clay">
                Back-office
              </span>
            </span>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Réduire"
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-rail-admin-muted transition-colors hover:bg-rail-admin-raised hover:text-rail-foreground md:flex"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fermer le menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rail-admin-muted hover:bg-rail-admin-raised md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className={cn("flex flex-1 flex-col gap-0.5 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
          {LINKS.map(({ href, label, icon: Icon }) => {
            // Exact match only — "/admin" is its own page now, not a shared
            // prefix for "/admin/comptes" and "/admin/licences".
            const active =
              pathname === href ||
              (href !== "/admin" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-[0.625rem] text-sm transition-colors",
                  collapsed ? "justify-center px-0" : "px-2.5",
                  active
                    ? "bg-clay font-bold text-white"
                    : "font-medium text-rail-admin-muted hover:bg-rail-admin-raised hover:text-rail-foreground",
                )}
              >
                <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Développer"
            className="hidden h-12 shrink-0 items-center justify-center border-t border-rail-admin-border text-rail-admin-muted transition-colors hover:bg-rail-admin-raised hover:text-rail-foreground md:flex"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="shrink-0 px-3 pb-3">
            <p className="rounded-[0.625rem] border border-rail-admin-border px-3 py-2.5 text-[0.7rem] leading-relaxed text-rail-admin-muted">
              Console réservée à l&apos;exploitant. Ni les cabinets ni les
              secrétariats n&apos;y ont accès.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
