import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { getProviderBySlug } from "@/lib/providers";
import { ClaimForm, type ClaimIntent } from "./claim-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscrire ou revendiquer un établissement",
  description:
    "Ajoutez votre établissement à l'annuaire DoctorY, ou demandez la gestion d'une fiche existante.",
};

export default async function RevendiquerPage({
  searchParams,
}: {
  searchParams: { type?: string; etablissement?: string };
}) {
  const intent: ClaimIntent =
    searchParams.type === "revendication" ? "revendication" : "inscription";

  const slug = searchParams.etablissement ?? "";
  const provider = slug ? await getProviderBySlug(slug) : null;
  const published = provider?.is_published ? provider : null;

  // A revendication without a listing has nothing to transfer. Rather than
  // quietly falling back to an inscription — which would create a duplicate of
  // the very listing they were trying to claim — send them to find it.
  const missingTarget = intent === "revendication" && !published;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {missingTarget ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-warm bg-card p-9 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warn-soft text-warn-foreground">
              <SearchX className="h-7 w-7" />
            </span>
            <h1 className="text-lg font-bold">Trouvez d&apos;abord votre fiche</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Cherchez votre établissement dans l&apos;annuaire et ouvrez sa
              fiche : le bouton « Revendiquer » s&apos;y trouve, et il sait de
              quelle fiche il parle.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2.5">
              <Link
                href="/recherche"
                className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
              >
                Chercher ma fiche
              </Link>
              <Link
                href="/pro/revendiquer?type=inscription"
                className="inline-flex h-11 items-center rounded-xl border border-input bg-card px-5 text-sm font-bold transition-colors hover:bg-paper-muted"
              >
                Elle n&apos;existe pas — l&apos;inscrire
              </Link>
            </div>
          </div>
        ) : (
          <ClaimForm
            intent={intent}
            providerSlug={published?.slug}
            providerName={published?.name}
          />
        )}
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
