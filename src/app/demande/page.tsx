import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarX2 } from "lucide-react";

import { getDoctorBySlug } from "@/lib/doctors";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demander un rendez-vous — DoctorY",
  description: "Demandez un rendez-vous. Le secrétariat vous rappelle pour confirmer.",
};

const SLOT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export default async function DemandePage({
  searchParams,
}: {
  searchParams: { medecin?: string; at?: string };
}) {
  const slug = searchParams.medecin ?? "";
  const at = searchParams.at ?? "";

  // Loaded here rather than in the form so the visitor can see whose agenda
  // they are booking without an extra client round-trip.
  const doctor = slug ? await getDoctorBySlug(slug) : null;
  const published = doctor?.is_published ? doctor : null;
  const hasSlot = SLOT_RE.test(at);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-8"
      style={{ backgroundImage: "url(/back-login.png)" }}
    >
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <Image
            src="/logo-doctory.png"
            alt="DoctorY"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-xl object-cover"
          />
          <span className="text-xl font-semibold tracking-tight text-slate-800">
            DoctorY
          </span>
        </Link>

        {/* A request is always for a specific slot on a specific doctor's
            calendar. Landing here without one means the visitor skipped that
            step, so send them back rather than collecting a request nobody can
            place. */}
        {!published || !hasSlot ? (
          <div className="rounded-2xl bg-white p-9 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <CalendarX2 className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-slate-800">
              Choisissez d&apos;abord un créneau
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {published
                ? `Sélectionnez une heure disponible dans l'agenda de ${published.title} ${published.full_name}, puis remplissez le formulaire.`
                : "Sélectionnez un médecin, puis une heure disponible dans son agenda."}
            </p>
            <Link
              href={published ? `/medecins/${published.slug}` : "/medecins"}
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-teal-600 px-6 font-semibold text-white transition-colors hover:bg-teal-700"
            >
              {published ? "Voir les créneaux" : "Voir les médecins"}
            </Link>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-2xl bg-white/70 shadow-2xl" />
            }
          >
            <RequestForm
              doctorSlug={published.slug}
              doctorName={`${published.title} ${published.full_name}`.trim()}
              doctorSpecialty={published.specialty}
              doctorPhoto={published.photo_url}
              at={at}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
