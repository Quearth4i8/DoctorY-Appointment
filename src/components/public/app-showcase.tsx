"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Stethoscope,
  Users,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The desktop app, shown rather than described: a window that cycles through
 * the real screens, with the tabs underneath doubling as the feature list.
 *
 * Every screenshot comes from the user guide's demo practice (Dr Mehdi
 * Karoui and his made-up patients) — never a real doctor's data or
 * letterhead.
 */

const SLIDES = [
  {
    src: "/app/tableau-de-bord.jpg",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    text: "Patients, consultations et rendez-vous du jour, d'un coup d'œil.",
  },
  {
    src: "/app/patients.jpg",
    label: "Patients",
    icon: Users,
    text: "Tous vos dossiers, retrouvés en tapant un nom ou un numéro.",
  },
  {
    src: "/app/consultations.jpg",
    label: "Consultations",
    icon: Stethoscope,
    text: "L'historique de chaque patient et son résumé clinique, d'un coup d'œil.",
  },
  {
    src: "/app/analyses.jpg",
    label: "Analyses",
    icon: FlaskConical,
    text: "Résultats en vert, orange ou rouge selon le profil du patient ; bilans scannés lus automatiquement.",
  },
  {
    src: "/app/exploration.jpg",
    label: "Explorations",
    icon: ClipboardList,
    text: "Radiologie, cardiologie, biopsies… rangées par spécialité.",
  },
  {
    src: "/app/rendez-vous.jpg",
    label: "Rendez-vous",
    icon: CalendarDays,
    text: "Vues jour, semaine et mois, synchronisées avec le secrétariat, et un rappel avant chaque patient.",
  },
  {
    src: "/app/formulaires.jpg",
    label: "Formulaires CNAM",
    icon: FileText,
    text: "BS, AP1 et APCI remplis et imprimés sur le formulaire papier.",
  },
] as const;

const SLIDE_MS = 5000;

export function AppShowcase({
  version,
  sizeMb,
  downloadHref,
}: {
  version: string;
  sizeMb: number;
  downloadHref: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const autoplay = !paused && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => setActive((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [active, autoplay]);

  const go = useCallback((i: number) => setActive(i), []);

  return (
    // Top padding only: the "professionnel de santé ?" band right after it
    // brings its own, and two stacked py-16s left a gap wider than any other
    // on the page.
    <section className="mx-auto w-full max-w-[1600px] px-4 pt-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground text-background">
        {/* Brand-coloured light behind the window, so the screenshot sits on
            something rather than floating on flat black. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40rem 30rem at 78% 40%, hsl(var(--primary) / 0.35), transparent 65%), radial-gradient(30rem 24rem at 10% 100%, hsl(var(--primary) / 0.18), transparent 70%)",
          }}
        />

        <div className="relative grid items-center gap-12 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14 lg:px-14 lg:py-16">
          {/* ── Pitch ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Pour les médecins
            </span>

            <h2 className="font-display text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[2.6rem]">
              Tout votre cabinet,
              <br />
              <span className="text-primary">dans une seule application.</span>
            </h2>

            <p className="max-w-xl text-[0.98rem] leading-relaxed text-background/70">
              Dossiers patients, consultations, analyses, ordonnances, formulaires
              CNAM et agenda : DoctorY rassemble votre quotidien sur votre ordinateur, et
              relie votre agenda aux demandes de rendez-vous reçues sur ce site.
            </p>

            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Vos données restent sur votre ordinateur",
                "Fonctionne sans connexion internet",
                "Ordonnances imprimées sur votre papier",
                "Agenda synchronisé avec votre secrétariat",
                "Bilans scannés lus automatiquement",
                "Notifications et rappels de rendez-vous",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-background/85">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={downloadHref}
                className="group/dl inline-flex h-14 items-center gap-3 rounded-2xl bg-primary pl-5 pr-6 text-primary-foreground shadow-lifted transition-all duration-base ease-spring hover:-translate-y-0.5 hover:brightness-110"
              >
                <Download className="h-5 w-5 transition-transform duration-base ease-spring group-hover/dl:translate-y-0.5" />
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[0.95rem] font-extrabold">Télécharger pour Windows</span>
                  <span className="text-[0.7rem] font-semibold opacity-80">
                    Version {version} · {sizeMb} Mo
                  </span>
                </span>
              </a>
              <Link
                href="/telecharger"
                className="inline-flex h-14 items-center gap-2 rounded-2xl border border-background/20 px-5 text-sm font-bold text-background transition-colors hover:bg-background/10"
              >
                Toutes les versions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="text-xs text-background/50">
              Windows 10 et 11 · Une clé de licence vous est remise à l&apos;installation.
            </p>
          </div>

          {/* ── Product window ────────────────────────────────────────── */}
          <div
            className="flex flex-col gap-5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div className="[perspective:2000px]">
              <div className="relative rounded-2xl border border-background/15 bg-background/5 p-1.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] transition-transform duration-700 ease-spring lg:[transform:rotateY(-7deg)_rotateX(3deg)] lg:hover:[transform:rotateY(0deg)_rotateX(0deg)]">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 truncate text-[0.72rem] font-semibold text-background/60">
                    DoctorY — {SLIDES[active].label}
                  </span>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-background">
                  {SLIDES.map((slide, i) => (
                    <Image
                      key={slide.src}
                      src={slide.src}
                      alt={`Application DoctorY : ${slide.label}`}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      priority={i === 0}
                      className={cn(
                        "object-cover object-top transition-all duration-700 ease-spring",
                        i === active ? "scale-100 opacity-100" : "scale-[1.02] opacity-0",
                      )}
                    />
                  ))}
                </div>

                <span className="absolute -bottom-4 left-6 inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-lifted">
                  <WifiOff className="h-3.5 w-3.5 text-primary" />
                  Fonctionne hors ligne
                </span>
              </div>
            </div>

            {/* Tabs: pick a screen; the running bar shows when it moves on. */}
            <div className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-8" role="tablist" aria-label="Écrans de l'application">
              {SLIDES.map((slide, i) => {
                const Icon = slide.icon;
                const on = i === active;
                return (
                  <button
                    key={slide.src}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => go(i)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border px-2 py-2.5 text-center text-[0.7rem] font-bold transition-colors",
                      on
                        ? "border-primary/50 bg-primary/15 text-background"
                        : "border-background/10 text-background/55 hover:border-background/25 hover:text-background/85",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", on && "text-primary")} />
                    <span className="leading-tight">{slide.label}</span>
                    {on ? (
                      <span
                        key={`${active}-${autoplay}`}
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                        style={
                          autoplay
                            ? { animation: `app-slide-progress ${SLIDE_MS}ms linear forwards` }
                            : undefined
                        }
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="min-h-[2.5rem] text-center text-sm text-background/70" aria-live="polite">
              {SLIDES[active].text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
