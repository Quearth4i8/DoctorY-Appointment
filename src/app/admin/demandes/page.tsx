import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { IntakeManager } from "@/components/admin/intake-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demandes — Admin — DoctorY",
  robots: { index: false, follow: false },
};

// Access itself is enforced in middleware.ts (a cookie check, unrelated to
// Supabase Auth) — this page can assume it only ever renders for an admin.
export default function AdminIntakePage() {
  return (
    <AdminShell>
      <IntakeManager />
    </AdminShell>
  );
}
