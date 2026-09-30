import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { ProfileForm, type AccountInfo } from "@/components/profile/profile-form";
import { resolveStaffDoctorId } from "@/lib/api-response";
import { createClient, getStaff, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil — DoctorY",
};

const AUTH_NOTICES = ["email_confirmed", "email_partial", "link_invalid"] as const;

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: { auth?: string };
}) {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  const supabase = createClient();
  const user = await getUser();

  // Whose cabinet this account works for — shown, never edited, here. A
  // lookup that fails (no doctor yet) just leaves the line out.
  let cabinet: string | null = null;
  try {
    const doctorId = await resolveStaffDoctorId(staff);
    const { data } = await supabase
      .from("doctors")
      .select("title, full_name")
      .eq("id", doctorId)
      .maybeSingle();
    const d = data as { title?: string | null; full_name?: string } | null;
    if (d?.full_name) cabinet = `${d.title?.trim() || "Dr"} ${d.full_name}`;
  } catch {
    cabinet = null;
  }

  const notice = AUTH_NOTICES.find((n) => n === searchParams.auth) ?? null;

  const account: AccountInfo = {
    authNotice: notice,
    createdAt: user?.created_at ?? null,
    lastSignInAt: user?.last_sign_in_at ?? null,
    pendingEmail: user?.new_email ?? null,
    cabinet,
  };

  return (
    <AppShell staff={staff}>
      <ProfileForm staff={staff} account={account} />
    </AppShell>
  );
}
