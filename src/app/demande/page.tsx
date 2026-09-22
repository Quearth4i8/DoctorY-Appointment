import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarX2 } from "lucide-react";

import { getDoctorById, getDoctorBySlug } from "@/lib/doctors";
import { getProviderBySlug } from "@/lib/providers";
import { RequestForm } from "./request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demander un rendez-vous — DoctorY",
  description: "Demandez un rendez-vous. Le secrétariat vous rappelle pour confirmer.",
};

const SLOT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * The doctor behind whichever handle the visitor arrived with.
 *
 * Two entry points, because the annuaire and the old pages address the same
 * agenda differently: `?medecin=` is a `doctors` slug, `?etablissement=` is a
 * `providers` slug. Requests are still submitted against a doctor slug, so an
 * establishment is resolved through `legacy_doctor_id` — not by assuming its
 * slug matches, which is true today only because the backfill copied it.
 *
 * `backHref` is where "choose a slot first" sends them, and it has to be the
 * page they actually came from or they bounce between two profiles.
 */
async function resolveTarget(searchParams: {
  medecin?: string;
  etablissement?: string;
}) {
  const providerSlug = searchParams.etablissement ?? "";
  if (providerSlug) {
    const provider = await getProviderBySlug(providerSlug);
    if (!provider?.is_published || !provider.legacy_doctor_id) {
      return { doctor: null, backHref: `/etablissement/${providerSlug}` };
    }
    const doctor = await getDoctorById(provider.legacy_doctor_id);
    return {
      doctor: doctor?.is_published ? doctor : null,
      backHref: `/etablissement/${provider.slug}#creneaux`,
    };
  }

  const slug = searchParams.medecin ?? "";
  const doctor = slug ? await getDoctorBySlug(slug) : null;
  return {
    doctor: doctor?.is_published ? doctor : null,
    backHref: slug ? `/medecins/${slug}` : "/recherche",
  };
}

export default async function DemandePage({
  searchParams,
}: {
  searchParams: { medecin?: string; etablissement?: string; at?: string };
}) {
  const at = searchParams.at ?? "";

  // Loaded here rather than in the form so the visitor can see whose agenda
  // they are booking without an extra client round-trip.
  const { doctor: published, backHref } = await resolveTarget(searchParams);
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warn-soft">
              <CalendarX2 className="h-7 w-7 text-warn-foreground" />
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
              href={backHref}
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-all hover:brightness-110"
            >
              {published ? "Voir les créneaux" : "Choisir un établissement"}
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
