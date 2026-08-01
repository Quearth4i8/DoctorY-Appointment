import type { Metadata } from "next";

import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { DoctorCard } from "@/components/public/doctor-card";
import { listPublishedDoctors } from "@/lib/doctors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nos médecins — DoctorY",
  description:
    "Consultez les profils des médecins : spécialité, adresse, horaires de consultation et tarifs.",
};

export default async function MedecinsPage() {
  const doctors = await listPublishedDoctors();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        <div className="border-b border-slate-100 bg-slate-50/60">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Nos médecins
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Choisissez un médecin pour voir sa spécialité, ses horaires de
              consultation et ses tarifs, puis envoyez votre demande de
              rendez-vous.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
          {doctors.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center text-sm text-slate-500">
              Aucun médecin publié pour le moment.
            </p>
          ) : (
            <div className="flex flex-wrap gap-5 [&>*]:min-w-[320px] [&>*]:flex-1 [&>*]:basis-[360px] [&>*]:max-w-[520px]">
              {doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
