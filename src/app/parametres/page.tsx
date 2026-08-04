import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AccessDenied } from "@/components/access-denied";
import { AppShell } from "@/components/app-shell";
import { DoctorSettingsForm } from "@/components/settings/doctor-settings-form";
import { PairingCard } from "@/components/settings/pairing-card";
import { getDoctorForStaff } from "@/lib/doctors";
import { getStaff } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Détails du médecin — DoctorY",
};

export default async function ParametresPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  // Bound staff edit their own doctor's page, nobody else's.
  const doctor = await getDoctorForStaff(staff.doctor_id);

  return (
    <AppShell staff={staff}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
              Détails du médecin
            </h1>
          </div>

          {doctor?.is_published ? (
            <Link
              href={`/medecins/${doctor.slug}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-4 text-sm font-medium text-foreground shadow-card transition-all hover:-translate-y-px hover:text-primary hover:shadow-card-hover"
            >
              Voir en ligne
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {doctor ? (
          <>
            <DoctorSettingsForm doctor={doctor} />
            <PairingCard />
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
