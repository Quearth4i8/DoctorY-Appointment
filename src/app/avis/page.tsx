import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FileWarning } from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Votre avis",
  description:
    "Dites-nous ce qui marche, ce qui manque et ce qui ne va pas sur DoctorY. Chaque message est lu.",
};

/**
 * Feedback about the site.
 *
 * The two panels at the bottom exist because most of what arrives on a page
 * like this is really one of two other things: a wrong listing, or a
 * professional wanting to be listed. Routing those out by name keeps the
 * channel useful and means the person gets a real answer instead of a thank-you
 * note from the wrong queue.
 */
export default function AvisPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="font-display text-[2.4rem] font-semibold leading-tight">
            Votre avis
          </h1>
          <p className="text-[1.02rem] leading-relaxed text-foreground/75">
            DoctorY est jeune et se construit avec ceux qui s&apos;en servent.
            Dites-nous ce qui manque, ce qui agace, ou ce qui vous a fait gagner
            du temps — c&apos;est ce qui décide de la suite.
          </p>
        </div>

        <FeedbackForm />

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/signaler"
            className="group flex gap-3.5 rounded-xl border border-border-warm bg-card p-5 transition-all duration-slow ease-spring hover:-translate-y-1 hover:border-primary/30 hover:shadow-lifted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn-foreground">
              <FileWarning className="h-5 w-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[0.92rem] font-bold">
                Une fiche est fausse ?
              </span>
              <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                Horaires, adresse, garde — signalez-le depuis la fiche et nous
                corrigeons.
              </span>
            </span>
          </Link>

          <Link
            href="/pro"
            className="group flex gap-3.5 rounded-xl border border-border-warm bg-card p-5 transition-all duration-slow ease-spring hover:-translate-y-1 hover:border-primary/30 hover:shadow-lifted"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[0.92rem] font-bold">
                Vous exercez dans la santé ?
              </span>
              <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                L&apos;inscription d&apos;un établissement passe par
                l&apos;espace professionnel.
              </span>
            </span>
          </Link>
        </div>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
