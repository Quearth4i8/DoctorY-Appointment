import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Inbox,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Reveal } from "@/components/public/reveal";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Ce qu'est DoctorY, comment une demande de rendez-vous fonctionne, et où vivent vos données.",
};

/**
 * What this is, in the visitor's terms.
 *
 * Deliberately built around the three booking modes, because that is the one
 * thing a patient needs to understand before using the site: some
 * establishments can show you a real time, some take a request, and some have
 * nothing to book at all. Getting that wrong is what makes people distrust a
 * booking site — they try to reserve at a pharmacy and conclude it is broken.
 */

const MODES = [
  {
    Icon: CalendarCheck,
    title: "Vous choisissez une heure",
    body: "Certains cabinets publient leur agenda en direct depuis leur propre logiciel. Vous voyez les créneaux réellement libres et vous en prenez un ; le secrétariat vous rappelle pour confirmer.",
    tint: "bg-primary-soft text-primary-soft-foreground",
  },
  {
    Icon: Inbox,
    title: "Vous dites quand vous pouvez",
    body: "D'autres — laboratoires, cliniques, opticiens — ne publient pas d'agenda. Vous indiquez vos disponibilités, ils vous rappellent pour fixer l'heure exacte.",
    tint: "bg-info-soft text-info-foreground",
  },
  {
    Icon: MapPin,
    title: "Vous y allez, simplement",
    body: "Les pharmacies et parapharmacies ne se réservent pas. Leur fiche vous donne les horaires, les gardes de la semaine et l'itinéraire — c'est ce dont vous avez besoin à 22 h.",
    tint: "bg-muted text-muted-foreground",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[52rem] px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.05]">
            Trouver un soignant ne devrait pas commencer par un appel sans
            réponse.
          </h1>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-foreground/75">
            DoctorY rassemble au même endroit les médecins, pharmacies,
            laboratoires, cliniques et opticiens : leurs horaires, leurs tarifs,
            leurs gardes, et le moyen de les joindre. C&apos;est un annuaire
            d&apos;abord, et une prise de rendez-vous là où c&apos;est possible.
          </p>
        </section>

        <Reveal>
          <section className="border-y border-border-warm bg-paper-muted">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Trois façons de prendre rendez-vous
              </h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-foreground/75">
                Tous les établissements ne fonctionnent pas pareil, et la fiche
                vous dit toujours lequel des trois vous avez en face.
              </p>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {MODES.map(({ Icon, title, body, tint }) => (
                  <div
                    key={title}
                    className="flex flex-col gap-3 rounded-xl border border-border-warm bg-card p-6"
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        tint,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[1.02rem] font-bold">{title}</h3>
                    <p className="text-[0.9rem] leading-relaxed text-foreground/75">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mx-auto w-full max-w-[52rem] px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Ce que nous ne faisons pas
            </h2>

            <ul className="mt-6 flex flex-col gap-5">
              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <UserRound className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <div>
                  <h3 className="font-bold">Aucune réservation automatique</h3>
                  <p className="mt-1 text-[0.92rem] leading-relaxed text-foreground/75">
                    Un créneau que vous choisissez est une demande, pas une
                    confirmation. Quelqu&apos;un la lit, vérifie que c&apos;est
                    tenable, et vous rappelle. Personne n&apos;arrive devant une
                    porte fermée parce qu&apos;un logiciel a dit oui.
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <ShieldCheck className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <div>
                  <h3 className="font-bold">Aucun dossier médical ici</h3>
                  <p className="mt-1 text-[0.92rem] leading-relaxed text-foreground/75">
                    Vos antécédents, vos ordonnances et les notes de votre
                    médecin restent sur son ordinateur. Ce site n&apos;en a
                    même pas la place en base.{" "}
                    <Link href="/confidentialite" className="font-semibold underline underline-offset-2">
                      Comment ça marche
                    </Link>
                    .
                  </p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <Inbox className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <div>
                  <h3 className="font-bold">Aucun compte à créer</h3>
                  <p className="mt-1 text-[0.92rem] leading-relaxed text-foreground/75">
                    Pas de mot de passe, pas de profil qui vous suit d&apos;un
                    établissement à l&apos;autre. Votre nom et votre téléphone
                    suffisent, et ne vont qu&apos;à l&apos;établissement
                    concerné.
                  </p>
                </div>
              </li>
            </ul>
          </section>
        </Reveal>

        <Reveal>
          <section className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border-warm bg-paper-muted px-7 py-6">
              <div className="flex min-w-[18rem] flex-1 flex-col gap-1.5">
                <h2 className="text-lg font-bold tracking-tight">
                  Vous exercez dans la santé ?
                </h2>
                <p className="text-sm leading-relaxed text-foreground/75">
                  Être référencé est gratuit et le restera. Publiez vos
                  horaires, vos tarifs et vos gardes en quelques minutes.
                </p>
              </div>
              <Link
                href="/pro"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all duration-base ease-spring hover:brightness-110"
              >
                Espace professionnel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </Reveal>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
