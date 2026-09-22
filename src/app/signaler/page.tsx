import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { getProviderBySlug } from "@/lib/providers";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signaler une erreur",
  description:
    "Un horaire faux, un numéro qui ne répond plus, un établissement fermé — dites-le nous et la fiche sera corrigée.",
  // A correction form has no business in search results: it is only ever
  // reached from the listing it corrects.
  robots: { index: false, follow: false },
};

export default async function SignalerPage({
  searchParams,
}: {
  searchParams: { etablissement?: string };
}) {
  const slug = searchParams.etablissement ?? "";
  const provider = slug ? await getProviderBySlug(slug) : null;
  const published = provider?.is_published ? provider : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {/* A report is always about a specific listing. Without one there is
            nothing to correct, so send them to find it rather than collect a
            complaint nobody can act on. */}
        {published ? (
          <ReportForm providerSlug={published.slug} providerName={published.name} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-warm bg-card p-9 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warn-soft text-warn-foreground">
              <SearchX className="h-7 w-7" />
            </span>
            <h1 className="text-lg font-bold">Quel établissement ?</h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ouvrez la fiche concernée et utilisez le bouton « Signaler une
              erreur » qui s&apos;y trouve : le signalement doit être rattaché à
              une fiche pour être corrigé.
            </p>
            <Link
              href="/recherche"
              className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              Chercher un établissement
            </Link>
          </div>
        )}
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
