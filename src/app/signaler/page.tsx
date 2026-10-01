import type { Metadata } from "next";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { getProviderBySlug } from "@/lib/providers";
import { ProviderPicker } from "./provider-picker";
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
        {/* A report is always about a specific listing. Reached without one
            (the menu, the footer), the page lets the visitor find it here
            rather than sending them off to search and come back. */}
        {published ? (
          <ReportForm providerSlug={published.slug} providerName={published.name} />
        ) : (
          <ProviderPicker />
        )}
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
