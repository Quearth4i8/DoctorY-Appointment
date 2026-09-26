import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Cross, ShieldCheck, UserRound } from "lucide-react";

import { Reveal } from "@/components/public/reveal";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { ProviderCard } from "@/components/public/provider-card";
import { SearchBar } from "@/components/public/search-bar";
import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import {
  countProvidersByKind,
  listOnDutyPharmacies,
  listSpecialties,
  searchProviders,
} from "@/lib/providers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DoctorY — toute la santé au même endroit",
  description:
    "Médecins, pharmacies, laboratoires, cliniques et opticiens. Trouvez qui il vous faut près de chez vous, consultez horaires et tarifs, et demandez un rendez-vous.",
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
    text: "Seul l'établissement voit votre demande. Votre dossier médical reste chez votre médecin.",
  },
  {
    icon: UserRound,
    title: "Confirmé par un humain",
    text: "Aucune réservation automatique : l'établissement valide chaque rendez-vous.",
  },
];

/** The small ruled label that opens a section. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary">
      <span aria-hidden className="h-px w-7 bg-primary/40" />
      {children}
    </span>
  );
}

export default async function LandingPage() {
  // Independent reads; no reason to make the page wait for them in turn.
  const [counts, onDuty, featured, specialties] = await Promise.all([
    countProvidersByKind(),
    listOnDutyPharmacies(),
    searchProviders({ limit: 3 }),
    listSpecialties(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* The hero's ground. Two very low-alpha washes of the brand colour
              rather than a flat panel: the page still reads as the same warm
              sheet as the rest of the site, but the top of it has somewhere
              for the eye to land. Built from the token, so dark mode and any
              future rebrand follow without touching this file. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(58rem 38rem at 76% 12%, hsl(var(--primary) / 0.10), transparent 62%), radial-gradient(42rem 30rem at 4% 0%, hsl(var(--primary) / 0.05), transparent 68%)",
            }}
          />

          <div className="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)] lg:px-8 lg:pb-24 lg:pt-20">
            <div className="flex max-w-[46rem] flex-col gap-6">
              <Eyebrow>Médecins · Pharmacies · Laboratoires</Eyebrow>

              <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]">
                Toute la santé,
                <br />
                <span className="text-primary">au même endroit.</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-foreground/75 sm:text-[1.05rem]">
                Médecins, pharmacies, laboratoires, cliniques, opticiens.
                Trouvez qui il vous faut près de chez vous, ouvert maintenant —
                et prenez rendez-vous quand c&apos;est possible.
              </p>

              {/* One control, nothing stacked around it.
                  The trade tabs and a row of "recherché maintenant" chips both
                  sat here: three rows of pills, one under the other, each
                  offering a different way to start the same search. The tabs
                  only ever pre-set what the results page's filter rail sets
                  anyway, and the chips duplicated "Par métier" below. */}
              <SearchBar
                specialties={specialties}
                showKinds={false}
                fullWidth
                className="rounded-[1.25rem] p-3 shadow-lifted"
              />
            </div>

            {/* Just the photograph. It carried two floating "live" cards for a
                while; they landed on the doctor's face, and a card hovering
                over a stock image is decoration pretending to be data. The
                establishments it advertised are two sections further down,
                where they are real rows. */}
            <div className="relative hidden lg:block">
              <div className="relative overflow-hidden rounded-[2rem] rounded-tl-[8rem] rounded-br-[8rem]">
                <Image
                  src="/home1.png"
                  alt="Un médecin accueille un patient au cabinet"
                  width={1456}
                  height={1092}
                  priority
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  className="w-full object-cover"
                />

                {/* Melts the photo's left edge into the hero wash, so it reads
                    as part of the page rather than a pasted-in window. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-2/5"
                  style={{
                    background:
                      "linear-gradient(to right, hsl(var(--paper)) 0%, hsl(var(--paper) / 0.55) 42%, hsl(var(--paper) / 0) 100%)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Everything below the hero rides on a panel that laps over it, so
            the tinted top of the page ends on a curve instead of a seam. */}
        <div className="relative z-10 -mt-8 rounded-t-[2.5rem] bg-paper pt-8">
          {/* Pharmacies de garde. Placed above the fold on purpose: at 22:00 it
              is the only thing anyone opens this site for, and burying it under
              a doctor list would be optimising the page for the calm case. */}
          <Reveal>
            <section className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-5 rounded-3xl bg-foreground px-6 py-5 text-background">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                  <Cross className="h-6 w-6" />
                </span>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-[1.05rem] font-bold">Pharmacies de garde</h2>
                  <p className="text-sm text-background/65">
                    {onDuty.length > 0
                      ? `${onDuty.length} pharmacie${onDuty.length > 1 ? "s" : ""} de garde en ce moment`
                      : "Le tour de garde de votre région, mis à jour chaque semaine"}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2.5">
                  {onDuty.slice(0, 2).map((p) => (
                    <Link
                      key={p.id}
                      href={`/etablissement/${p.slug}`}
                      className="flex min-w-[11rem] flex-col gap-0.5 rounded-2xl bg-background/10 px-3.5 py-2.5 transition-colors hover:bg-background/15"
                    >
                      <span className="truncate text-[0.82rem] font-bold">{p.name}</span>
                      <span className="truncate font-mono text-xs text-primary">
                        {p.city}
                      </span>
                    </Link>
                  ))}

                  <Link
                    href="/gardes"
                    className="group/cta inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition-all duration-base ease-spring hover:brightness-110"
                  >
                    Toutes les gardes
                    <ArrowRight className="h-4 w-4 transition-transform duration-base ease-spring group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </section>
          </Reveal>

          {/* Par métier. Hidden outright while nothing is listed, rather
              than standing empty under its own heading. */}
          {KIND_ORDER.some((k) => (counts[k] ?? 0) > 0) ? (
          <Reveal>
            <section className="mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <Eyebrow>Le catalogue</Eyebrow>
                  <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
                    Par métier
                  </h2>
                </div>
                <Link
                  href="/annuaire"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-warm bg-card px-4 text-sm font-bold transition-colors duration-base hover:bg-paper-muted"
                >
                  Voir tous les métiers
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* auto-fill rather than a fixed six columns: the row holds
                  however many trades actually have establishments without
                  leaving stretched, empty tracks when that is only two. */}
              <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
                {KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0)
                  .slice(0, 6)
                  .map((kind) => {
                  const meta = kindMeta(kind);
                  const n = counts[kind] ?? 0;
                  return (
                    <Link
                      key={kind}
                      href={`/recherche?kind=${kind}`}
                      className="group flex flex-col gap-3 rounded-xl border border-border-warm bg-card p-4 transition-all duration-slow ease-spring hover:-translate-y-1 hover:border-primary/30 hover:shadow-lifted"
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          meta.chip,
                        )}
                      >
                        <meta.Icon className={cn("h-5 w-5", meta.glyph)} />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[0.85rem] font-bold leading-tight">
                          {meta.plural}
                        </span>
                        <span className="font-mono text-[0.7rem] text-muted-foreground tnum">
                          {`${n} fiche${n > 1 ? "s" : ""}`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </Reveal>
        ) : null}

          {featured.length > 0 ? (
            <Reveal>
              <section className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3">
                  <Eyebrow>Autour de vous</Eyebrow>
                  <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
                    Près de chez vous
                  </h2>
                </div>
                <div className="mt-8 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {featured.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              </section>
            </Reveal>
          ) : null}

          {/* Reassurance */}
          <Reveal>
            <section className="border-y border-border-warm bg-paper-muted">
              <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
                {POINTS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* Professionnels */}
          <Reveal>
            <section className="mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-8 rounded-3xl border border-border-warm bg-paper-muted px-7 py-7">
                <div className="flex min-w-[20rem] flex-1 flex-col gap-2">
                  <h2 className="font-display text-[1.7rem] font-semibold tracking-[-0.02em]">
                    Vous êtes un professionnel de santé ?
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">
                    Publiez votre établissement, vos horaires et vos tarifs
                    gratuitement. Recevez les demandes de rendez-vous dans un
                    tableau de bord — et, si vous travaillez avec
                    l&apos;application DoctorY sur votre poste, laissez vos
                    créneaux réels s&apos;afficher en direct.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href="/pro"
                    className="inline-flex h-12 items-center rounded-xl bg-primary px-6 text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110"
                  >
                    Inscrire mon établissement
                  </Link>
                  <Link
                    href="/pro/revendiquer"
                    className="inline-flex h-12 items-center rounded-xl border border-input bg-card px-5 text-[0.95rem] font-bold transition-colors hover:bg-paper"
                  >
                    Revendiquer une fiche
                  </Link>
                </div>
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
