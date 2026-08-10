import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { LicenseDashboard } from "@/components/admin/license-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Licences — Admin — DoctorY",
  robots: { index: false, follow: false },
};

// Access itself is enforced in middleware.ts (a cookie check, unrelated to
// Supabase Auth) — this page can assume it only ever renders for an admin.
export default function AdminLicencesPage() {
  return (
    <AdminShell>
      <LicenseDashboard />
    </AdminShell>
  );
}
