"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Home,
  Inbox,
  LogOut,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

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

const LINKS = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/demandes", label: "Demandes", icon: Inbox },
] as const;

export function AppNavbar({ staff }: { staff: Staff }) {
  const pathname = usePathname();
  const name = staff.full_name || "Compte";
  const [first = "", ...rest] = name.split(" ");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/agenda"
          className="flex shrink-0 items-center gap-2.5 rounded-lg pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Image
            src="/logo-doctory.png"
            alt="DoctorY"
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="hidden text-[0.95rem] font-semibold tracking-tight sm:block">
            DoctorY
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-[1.05rem] w-[1.05rem]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Back to the public site — the staff hub at "/" was replaced by the
              patient landing page. */}
          <Link
            href="/"
            aria-label="Accueil du site"
            title="Accueil du site"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Home className="h-[1.05rem] w-[1.05rem]" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="group flex h-10 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[state=open]:bg-secondary">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold",
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
                <p className="truncate text-sm font-semibold text-foreground">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {staff.email}
                </p>
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
                  Page publique
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
      </div>
    </header>
  );
}
