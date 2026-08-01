import { AppNavbar } from "@/components/app-navbar";
import type { Staff } from "@/lib/supabase/server";

/**
 * Navbar + page container shared by every signed-in page.
 *
 * The container is wide (1600px) rather than a narrow reading column: this is a
 * dense working tool, and the secretary's screen should be filled with patients
 * and appointments, not margin.
 */
export function AppShell({
  staff,
  children,
}: {
  staff: Staff;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar staff={staff} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
