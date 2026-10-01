import type { Metadata } from "next";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { DoctorSettingsForm } from "@/components/settings/doctor-settings-form";
import { PairingCard } from "@/components/settings/pairing-card";
import { getDoctorForStaff } from "@/lib/doctors";
import { listSpecialties } from "@/lib/providers";
import { createClient, getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Détails du médecin — DoctorY",
};

export default async function ParametresPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  // Bound staff edit their own doctor's page, nobody else's.
  const doctor = await getDoctorForStaff(staff.doctor_id);

  // The closed taxonomy, narrowed to what a cabinet may claim — the form must
  // not offer "Optique" to a médecin. Current picks come from the database
  // through the same staff binding the setter uses, so the boxes ticked here
  // are always the ones that will be saved.
  const supabase = createClient();
  const [allSpecialties, { data: mine }] = await Promise.all([
    listSpecialties(),
    supabase.rpc("get_doctor_specialties"),
  ]);

  const specialtyOptions = allSpecialties.filter((s) =>
    s.kinds.includes("medecin"),
  );
  // The RPC returns { slugs, custom }. Anything else — an older function
  // still deployed, or a failed call — degrades to an empty picker rather
  // than breaking the settings page.
  const raw = (mine ?? {}) as { slugs?: unknown; custom?: unknown };
  const selectedSpecialties = {
    slugs: Array.isArray(raw.slugs) ? (raw.slugs as string[]) : [],
    custom: Array.isArray(raw.custom) ? (raw.custom as string[]) : [],
  };

  return (
    <AppShell staff={staff}>
      <div className="flex flex-col gap-6">
        {doctor ? (
          <>
            <DoctorSettingsForm
              doctor={doctor}
              specialtyOptions={specialtyOptions}
              selectedSpecialties={selectedSpecialties}
              pairing={<PairingCard />}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
            <p className="text-base font-semibold text-foreground">
              Aucun profil médecin
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Exécutez la migration <code>20260731040000_doctors.sql</code> dans
              Supabase : elle crée la table et un profil vierge à compléter ici.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
