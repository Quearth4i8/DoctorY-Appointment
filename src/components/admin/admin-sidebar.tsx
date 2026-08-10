"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
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
          className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-all duration-200",
          "md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0",
          collapsed && "md:w-16",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Développer"
            className="hidden h-16 shrink-0 items-center justify-center border-b transition-colors hover:bg-secondary md:flex"
          >
            <Image
              src="/logo-doctory.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
            />
          </button>
        ) : (
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/logo-doctory.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
              />
              <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Admin</span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Réduire"
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground md:flex"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fermer le menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}>
          {LINKS.map(({ href, label, icon: Icon }) => {
            // Exact match only — "/admin" is its own page now, not a shared
            // prefix for "/admin/comptes" and "/admin/licences".
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onMobileClose}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
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
            className="hidden h-12 shrink-0 items-center justify-center border-t text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground md:flex"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </aside>
    </>
  );
}
