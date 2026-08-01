import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { ProfileForm } from "@/components/profile/profile-form";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil — DoctorY",
};

export default async function ProfilPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  return (
    <AppShell staff={staff}>
      <ProfileForm staff={staff} />
    </AppShell>
  );
}
