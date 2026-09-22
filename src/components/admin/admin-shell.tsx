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
/*
 * One scroll container, not two.
 *
 * This was `h-screen overflow-hidden` on the frame with `overflow-y-auto` on
 * the main column — a nested scroller. That pattern gives the window two
 * scrollbars whenever anything escapes the frame's fixed 100vh, and leaves a
 * band of dead page below the shell once the outer one moves. It also breaks
 * `scroll-margin` and any `#anchor` jump, because the thing that scrolls is no
 * longer the document.
 *
 * Now the page scrolls, once, like every other page in the app: the frame
 * grows with its content (`min-h-screen`) and the rail is `sticky` so it stays
 * put without owning a scrollport of its own.
 */
    <div className="flex min-h-screen bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
