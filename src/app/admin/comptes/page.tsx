import type { Metadata } from "next";

import { AccountsManager } from "@/components/admin/accounts-manager";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comptes — Admin — DoctorY",
  robots: { index: false, follow: false },
};

// Access itself is enforced in middleware.ts (a cookie check, unrelated to
// Supabase Auth) — this page can assume it only ever renders for an admin.
export default function AdminAccountsPage() {
  return (
    <AdminShell>
      <AccountsManager />
    </AdminShell>
  );
}
