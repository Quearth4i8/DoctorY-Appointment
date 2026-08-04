import { AppNavbar } from "@/components/app-navbar";
import type { Staff } from "@/lib/supabase/server";

/**
 * Navbar + page container shared by every signed-in page.
 *
 * Full width, with padding rather than a cap. This is a dense working tool: the
 * agenda gets seven columns and the patient list a dozen fields, and every pixel
 * spent on margin is one of them squeezed. A reading column would be right for
 * prose and is wrong for a grid.
 *
 * The navbar uses the same padding scale so the logo lines up with the content
 * beneath it instead of floating in from a different edge.
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
      <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
