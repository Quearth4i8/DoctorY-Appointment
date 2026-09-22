import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProviderEditor } from "@/components/admin/provider-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fiche — Admin — DoctorY",
  robots: { index: false, follow: false },
};

export default function AdminProviderPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AdminShell>
      <ProviderEditor id={params.id} />
    </AdminShell>
  );
}
