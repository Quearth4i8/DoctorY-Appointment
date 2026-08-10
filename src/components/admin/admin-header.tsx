"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu } from "lucide-react";

import { LogoutButton } from "./logout-button";

const TITLES: Record<string, string> = {
  "/admin": "Vue d'ensemble",
  "/admin/comptes": "Comptes",
  "/admin/licences": "Licences",
};

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Admin";

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/"
          aria-label="Accueil du site"
          title="Accueil du site"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Home className="h-[1.05rem] w-[1.05rem]" />
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
