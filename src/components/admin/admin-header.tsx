"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { LogoutButton } from "./logout-button";

const TITLES: Record<string, string> = {
  "/admin": "Licences",
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

      <div className="ml-auto">
        <LogoutButton />
      </div>
    </header>
  );
}
