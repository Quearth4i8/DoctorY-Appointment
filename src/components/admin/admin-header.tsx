"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu } from "lucide-react";

import { LogoutButton } from "./logout-button";

const TITLES: Record<string, string> = {
  "/admin": "Vue d'ensemble",
  "/admin/demandes": "Demandes",
  "/admin/etablissements": "Établissements",
  "/admin/comptes": "Comptes",
  "/admin/licences": "Licences",
};

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Admin";

  return (
    <header className="sticky top-0 z-20 flex h-[3.625rem] shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="truncate text-[1.05rem] font-bold tracking-tight">{title}</h1>
        <span className="hidden rounded-full bg-clay/10 px-2 py-0.5 text-[0.65rem] font-extrabold text-clay sm:inline">
          Back-office
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/"
          aria-label="Accueil du site"
          title="Accueil du site"
          className="flex h-9 w-9 items-center justify-center rounded-[0.625rem] border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Home className="h-[1.05rem] w-[1.05rem]" />
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
