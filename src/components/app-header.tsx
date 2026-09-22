"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Home, LogOut, Menu, Settings, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { Staff } from "@/lib/supabase/server";

const TITLES: Record<string, string> = {
  "/agenda": "Agenda",
  "/patients": "Patients",
  "/demandes": "Demandes",
  "/profil": "Profil",
  "/parametres": "Détails du médecin",
};

/** Today, spelled out — the console is a day-shaped tool. */
function today(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function AppHeader({ staff, onMenuClick }: { staff: Staff; onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "";
  const name = staff.full_name || "Compte";
  const [first = "", ...rest] = name.split(" ");

  return (
    <header className="sticky top-0 z-30 flex h-[var(--app-header-h)] shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-baseline gap-2.5">
        <h1 className="truncate text-[1.05rem] font-bold tracking-tight">{title}</h1>
        <span className="hidden truncate font-mono text-[0.78rem] capitalize text-muted-foreground tnum sm:block">
          {today()}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/"
          aria-label="Accueil du site"
          title="Accueil du site"
          className="flex h-9 w-9 items-center justify-center rounded-[0.625rem] border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Home className="h-[1.05rem] w-[1.05rem]" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="group flex h-10 items-center gap-2 rounded-[0.625rem] pl-1 pr-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-secondary">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[0.625rem] text-xs font-bold",
                avatarColor(staff.user_id),
              )}
            >
              {initials(first, rest.join(" ") || first)}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
              {name}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="truncate text-sm font-semibold text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{staff.email}</p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/profil">
                <UserRound />
                Profil
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/parametres">
                <Settings />
                Détails du médecin
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* A real POST so the session cookie is cleared server-side. */}
            <DropdownMenuItem asChild destructive>
              <form action="/auth/signout" method="post" className="w-full">
                <button type="submit" className="flex w-full items-center gap-2.5">
                  <LogOut />
                  Se déconnecter
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
