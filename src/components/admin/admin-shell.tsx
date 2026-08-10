"use client";

import { useState } from "react";

import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

/**
 * Deliberately not AppShell: that sidebar/header pair is built around a
 * signed-in doctor's staff row (agenda/patients/etc links) and Supabase Auth.
 * This is a single operator's tool with its own password gate, so it gets
 * its own sidebar + header rather than a repurposed secretary nav.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
