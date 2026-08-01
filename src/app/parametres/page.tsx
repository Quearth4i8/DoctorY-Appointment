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
  title: "Paramètres — DoctorY",
};

export default async function ParametresPage() {
  const staff = await getStaff();
  if (!staff) return <AccessDenied />;

  // Bound staff edit their own doctor's page, nobody else's.
  const doctor = await getDoctorForStaff(staff.doctor_id);

  return (
    <AppShell staff={staff}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Page publique
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Ce que les patients voient avant de demander un rendez-vous.
            </p>
          </div>

          {doctor?.is_published ? (
            <Link
              href={`/medecins/${doctor.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Voir la page publique
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {doctor ? (
          <>
            <PairingCard />
            <DoctorSettingsForm doctor={doctor} />
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
