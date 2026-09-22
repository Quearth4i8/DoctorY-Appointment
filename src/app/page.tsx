import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Cross,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { ProviderCard } from "@/components/public/provider-card";
import { SearchBar } from "@/components/public/search-bar";
import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import { countProvidersByKind, listOnDutyPharmacies, searchProviders } from "@/lib/providers";
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

const SUGGESTIONS = [
  "Pharmacie de garde",
  "Dentiste à Sousse",
  "Analyse NFS",
  "Pédiatre ouvert samedi",
];

export default async function LandingPage() {
  // Three independent reads; no reason to make the page wait for them in turn.
  const [counts, onDuty, featured] = await Promise.all([
    countProvidersByKind(),
    listOnDutyPharmacies(),
    searchProviders({ limit: 3 }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_31rem] lg:px-8 lg:py-20">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              Confirmé par le secrétariat, jamais par un robot
            </span>

            <h1 className="font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]">
              Toute la santé,
              <br />
              au même endroit.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-foreground/75 sm:text-[1.05rem]">
              Médecins, pharmacies, laboratoires, cliniques, opticiens. Trouvez
              qui il vous faut près de chez vous, ouvert maintenant — et prenez
              rendez-vous quand c&apos;est possible.
            </p>

            <SearchBar />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.8rem] text-muted-foreground">
                Recherché maintenant :
              </span>
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/recherche?q=${encodeURIComponent(s)}`}
                  className="inline-flex h-8 items-center rounded-full border border-border-warm bg-card px-3 text-[0.8rem] font-semibold text-foreground/75 transition-colors hover:bg-paper-muted"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <Image
              src="/home1.png"
              alt="Un médecin accueille un patient au cabinet"
              width={1456}
              height={1092}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="w-full rounded-3xl border border-border-warm object-cover"
            />
          </div>
        </section>

        {/* Pharmacies de garde. Placed above the fold on purpose: at 22:00 it
            is the only thing anyone opens this site for, and burying it under
            a doctor list would be optimising the page for the calm case. */}
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
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition-all hover:brightness-110"
              >
                Toutes les gardes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Par métier */}
        <section className="mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Par métier
            </h2>
            <Link
              href="/recherche"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-warm bg-card px-4 text-sm font-bold transition-colors hover:bg-paper-muted"
            >
              Explorer l&apos;annuaire
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {KIND_ORDER.map((kind) => {
              const meta = kindMeta(kind);
              const n = counts[kind] ?? 0;
              return (
                <Link
                  key={kind}
                  href={`/recherche?kind=${kind}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-border-warm bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
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
                      {n > 0 ? `${n} fiche${n > 1 ? "s" : ""}` : "bientôt"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Près de chez vous
            </h2>
            <div className="mt-8 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {featured.map((p) => (
                <ProviderCard key={p.id} provider={p} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Reassurance */}
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

        {/* Professionnels */}
        <section className="mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-8 rounded-3xl border border-border-warm bg-paper-muted px-7 py-7">
            <div className="flex min-w-[20rem] flex-1 flex-col gap-2">
              <h2 className="font-display text-[1.7rem] font-semibold tracking-[-0.02em]">
                Vous êtes un professionnel de santé ?
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-foreground/75">
                Publiez votre établissement, vos horaires et vos tarifs
                gratuitement. Recevez les demandes de rendez-vous dans un tableau
                de bord — et, si vous travaillez avec l&apos;application DoctorY sur
                votre poste, laissez vos créneaux réels s&apos;afficher en direct.
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
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
