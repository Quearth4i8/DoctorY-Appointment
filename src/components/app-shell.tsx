"use client";

import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import type { Staff } from "@/lib/supabase/server";

/**
 * Sidebar + header + page container shared by every signed-in page.
 *
 * Full width, with padding rather than a cap. This is a dense working tool: the
 * agenda gets seven columns and the patient list a dozen fields, and every pixel
 * spent on margin is one of them squeezed. A reading column would be right for
 * prose and is wrong for a grid.
 *
 * The mobile drawer's open state lives here (not inside AppSidebar) because
 * AppHeader's menu button is the thing that opens it — a client component,
 * so this needs "use client" too, but staff still comes from the server page.
 */
export function AppShell({
  staff,
  children,
}: {
  staff: Staff;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader staff={staff} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
