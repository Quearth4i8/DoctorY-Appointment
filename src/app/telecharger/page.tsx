import type { Metadata } from "next";
import Image from "next/image";
import {
  CheckCircle2,
  Download,
  HardDrive,
  KeyRound,
  MonitorDown,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import {
  LATEST_RELEASE,
  RELEASES,
  downloadUrl,
  formatReleaseDate,
  installerName,
} from "@/lib/desktop-releases";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Télécharger l'application — DoctorY",
  description:
    "Téléchargez DoctorY pour Windows : dossiers patients, consultations, analyses, ordonnances, formulaires CNAM et agenda, sur votre ordinateur. Toutes les versions et leurs nouveautés.",
};

const STEPS = [
  {
    icon: MonitorDown,
    title: "Installez",
    text: "Lancez le fichier téléchargé. Si Windows affiche « Windows a protégé votre ordinateur », cliquez sur « Informations complémentaires » puis « Exécuter quand même ».",
  },
  {
    icon: KeyRound,
    title: "Activez",
    text: "Saisissez la clé de licence reçue. Une connexion internet n'est nécessaire que pour cette première activation.",
  },
  {
    icon: CheckCircle2,
    title: "Travaillez",
    text: "Créez votre compte médecin et ajoutez vos patients. Tout reste sur votre ordinateur, même sans internet.",
  },
];

const REQUIREMENTS = [
  { icon: MonitorDown, label: "Windows 10 ou 11 (64 bits)" },
  { icon: HardDrive, label: "500 Mo d'espace disque" },
  { icon: WifiOff, label: "Internet uniquement pour l'activation" },
  { icon: ShieldCheck, label: "Données stockées sur votre poste" },
];

export default function DownloadPage() {
  const latest = LATEST_RELEASE;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Latest version ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border-warm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50rem 32rem at 80% 10%, hsl(var(--primary) / 0.12), transparent 62%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:px-8 lg:py-20">
            <div className="flex flex-col gap-6">
              <span className="inline-flex items-center gap-3 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary">
                <span aria-hidden className="h-px w-7 bg-primary/40" />
                Application DoctorY
              </span>
              <h1 className="font-display text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.025em] sm:text-[3.1rem]">
                Télécharger DoctorY
                <br />
                <span className="text-primary">pour Windows</span>
              </h1>
              <p className="max-w-xl text-[1.02rem] leading-relaxed text-foreground/75">
                Dossiers patients, consultations, analyses, ordonnances,
                formulaires CNAM et agenda, sur l&apos;ordinateur de
                votre cabinet.
              </p>

              <div className="flex flex-col gap-3 rounded-2xl border border-border-warm bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[0.7rem] font-extrabold text-primary-foreground">
                    Dernière version
                  </span>
                  <span className="font-mono text-sm font-bold tnum">v{latest.version}</span>
                  <span className="text-sm text-muted-foreground">
                    · {formatReleaseDate(latest.date)} · {latest.sizeMb} Mo
                  </span>
                </div>

                <a
                  href={downloadUrl(latest)}
                  className="group/dl inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-6 text-primary-foreground shadow-lifted transition-all duration-base ease-spring hover:-translate-y-0.5 hover:brightness-110"
                >
                  <Download className="h-5 w-5 transition-transform duration-base ease-spring group-hover/dl:translate-y-0.5" />
                  <span className="text-base font-extrabold">Télécharger la version {latest.version}</span>
                </a>
                <p className="text-center font-mono text-[0.7rem] text-muted-foreground">
                  {installerName(latest.version)}
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border-warm bg-card p-1.5 shadow-lifted">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[0.72rem] font-semibold text-muted-foreground">
                    DoctorY — Tableau de bord
                  </span>
                </div>
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
                  <Image
                    src="/app/tableau-de-bord.jpg"
                    alt="Le tableau de bord de l'application DoctorY"
                    fill
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-16 px-4 py-16 sm:px-6 lg:px-8">
          {/* ── What's new ─────────────────────────────────────────────── */}
          <section id="nouveautes" className="scroll-mt-28 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-3xl border border-border-warm bg-card p-7 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold">Nouveautés de la version {latest.version}</h2>
                  <p className="text-sm text-muted-foreground">{latest.title}</p>
                </div>
              </div>
              <ul className="mt-5 flex flex-col gap-3">
                {latest.notes.map((note) => (
                  <li key={note} className="flex items-start gap-3 text-[0.95rem] leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-border-warm bg-paper-muted p-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                Configuration requise
              </h2>
              <ul className="flex flex-col gap-3">
                {REQUIREMENTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Install ────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-6">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Installation en trois étapes
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li
                  key={title}
                  className="relative flex flex-col gap-3 rounded-2xl border border-border-warm bg-card p-6 shadow-card"
                >
                  <span className="absolute right-5 top-4 font-display text-4xl font-semibold text-primary/15">
                    {i + 1}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Updating ───────────────────────────────────────────────── */}
          <section className="flex flex-wrap items-start gap-5 rounded-3xl bg-foreground p-7 text-background">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <RefreshCw className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">Mettre à jour l&apos;application</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-background/70">
                Votre version s&apos;affiche en bas du menu de l&apos;application. Si
                elle est plus ancienne que la {latest.version}, téléchargez la
                nouvelle version et installez-la par-dessus : vos patients, vos
                consultations et votre licence sont conservés. Par précaution,
                gardez une copie de vos données avant chaque mise à jour.
              </p>
            </div>
          </section>

          {/* ── All versions ───────────────────────────────────────────── */}
          <section id="versions" className="scroll-mt-28 flex flex-col gap-6">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              Toutes les versions
            </h2>

            <ol className="relative flex flex-col gap-4 border-l border-border-warm pl-6">
              {RELEASES.map((release, i) => (
                <li key={release.version} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[1.94rem] top-6 h-3.5 w-3.5 rounded-full border-2 border-paper",
                      i === 0 ? "bg-primary" : "bg-border",
                    )}
                  />
                  <div className="flex flex-col gap-4 rounded-2xl border border-border-warm bg-card p-5 shadow-card sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-bold tnum">v{release.version}</span>
                        {i === 0 ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider text-primary">
                            Actuelle
                          </span>
                        ) : null}
                        <span className="text-sm text-muted-foreground">
                          {formatReleaseDate(release.date)}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold">{release.title}</p>
                      <ul className="mt-2 flex flex-col gap-1">
                        {release.notes.map((note) => (
                          <li key={note} className="flex gap-2 text-sm text-muted-foreground">
                            <span aria-hidden>·</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {release.downloadable ? (
                      <a
                        href={downloadUrl(release)}
                        className={cn(
                          "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all",
                          i === 0
                            ? "bg-primary text-primary-foreground hover:brightness-110"
                            : "border border-input bg-card hover:bg-paper-muted",
                        )}
                      >
                        <Download className="h-4 w-4" />
                        {release.sizeMb} Mo
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground sm:pt-2">
                        Plus proposée
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
