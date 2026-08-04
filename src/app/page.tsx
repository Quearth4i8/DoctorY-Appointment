import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  Clock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { DoctorCard } from "@/components/public/doctor-card";
import { listPublishedDoctors } from "@/lib/doctors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DoctorY — Trouvez votre médecin et prenez rendez-vous",
  description:
    "Trouvez votre médecin, consultez ses horaires et ses tarifs, et demandez un rendez-vous en quelques minutes.",
};

const POINTS = [
  {
    icon: Clock,
    title: "Sans attente au téléphone",
    text: "Envoyez votre demande à toute heure, même quand le secrétariat est fermé.",
  },
  {
    icon: ShieldCheck,
    title: "Vos données restent privées",
    text: "Seul le secrétariat voit votre demande. Votre dossier médical reste chez votre médecin.",
  },
  {
    icon: Stethoscope,
    title: "Confirmé par un humain",
    text: "Aucune réservation automatique : le secrétariat valide chaque rendez-vous.",
  },
];

export default async function LandingPage() {
  const doctors = await listPublishedDoctors();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/bg_image.png)" }}
          />
          {/* Fades the artwork into the next section instead of cutting it off.
              Taller now that the photo dissolves into it rather than sitting on
              top: the two fades overlap, so the hand-off has to be gradual. */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />

          <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 py-20 sm:px-6 lg:px-8 lg:grid-cols-2 lg:py-28">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-700">
                <Stethoscope className="h-3.5 w-3.5" />
                Prise de rendez-vous en ligne
              </span>

              <h1 className="mt-5 text-4xl font-bold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl">
                Trouvez votre médecin,{" "}
                <span className="text-teal-600">prenez rendez-vous</span> en
                quelques minutes.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                Consultez les horaires et les tarifs, envoyez votre demande quand
                vous voulez, et laissez le secrétariat vous rappeler pour
                confirmer. Sans compte, sans attente au téléphone.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/medecins"
                  className="flex h-12 items-center gap-2 rounded-xl bg-teal-600 px-6 font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-xl"
                >
                  <CalendarPlus className="h-[1.15rem] w-[1.15rem]" />
                  Trouver un médecin
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
              {/* Fades out at the bottom instead of ending on a hard rounded
                  edge and a drop shadow, which read as a card pasted onto the
                  page rather than part of it. The shadow goes with it — there is
                  nothing left down there to cast one. */}
              <Image
                src="/home1.png"
                alt="Un médecin vous accueille"
                width={1456}
                height={1092}
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="fade-bottom relative w-full rounded-3xl object-cover"
              />
            </div>
          </div>
        </section>

        {/* Doctors. No border: the hero above already dissolves into white, and
            a rule drawn across the end of that fade puts back the hard edge the
            fade exists to remove. */}
        <section>
          <div className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Nos médecins
                </h2>
                <p className="mt-3 text-slate-600">
                  Consultez un profil pour voir les horaires de consultation et
                  les tarifs.
                </p>
              </div>
              {doctors.length > 0 ? (
                <Link
                  href="/medecins"
                  className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
                >
                  Tout voir <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            {doctors.length === 0 ? (
              <p className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center text-sm text-slate-500">
                Aucun médecin publié pour le moment.
              </p>
            ) : (
              <div className="mt-10 flex flex-wrap gap-5 [&>*]:min-w-[320px] [&>*]:flex-1 [&>*]:basis-[360px] [&>*]:max-w-[520px]">
                {doctors.slice(0, 6).map((d) => (
                  <DoctorCard key={d.id} doctor={d} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Reassurance */}
        <section className="border-t border-slate-100 bg-slate-50/60">
          <div className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-20 sm:px-6 lg:px-8 md:grid-cols-3">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-100">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-20 sm:px-6 lg:px-8">
            <div
              className="relative overflow-hidden rounded-3xl bg-slate-100 bg-cover bg-center px-8 py-16"
              style={{ backgroundImage: "url(/help.png)" }}
            >
              {/* The photo is bright, so the copy is dark and sits on a soft
                  scrim rather than fighting the background for contrast. */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/70 to-white/40" />
              <div className="relative max-w-xl">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Besoin d&apos;un rendez-vous ?
                </h2>
                <p className="mt-3 text-slate-600">
                  Choisissez votre médecin, sélectionnez un créneau qui vous
                  arrange, et le secrétariat vous rappelle pour confirmer.
                </p>
                <Link
                  href="/medecins"
                  className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-teal-600 px-7 font-semibold text-white shadow-lg shadow-teal-600/20 transition-colors hover:bg-teal-700"
                >
                  <CalendarPlus className="h-[1.15rem] w-[1.15rem]" />
                  Voir les médecins
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
