import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProviderCard } from "@/components/public/provider-card";
import { Reveal } from "@/components/public/reveal";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SearchBar } from "@/components/public/search-bar";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import {
  countProvidersByKind,
  listSpecialties,
  searchProviders,
} from "@/lib/providers";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Médecins & pharmacies",
  description:
    "Tous les métiers référencés sur DoctorY : médecins, dentistes, pharmacies, laboratoires, cliniques, opticiens, infirmiers et sages-femmes.",
};

/**
 * The catalogue.
 *
 * It used to be twelve trades as twelve five-line cards, split across four
 * titled sections: three screens of scrolling to offer twelve links, ten of
 * which led to an empty results page because nothing is listed under them yet.
 * A visitor looking for the one pharmacy in the directory had to read past ten
 * trades that could not help them in order to find it.
 *
 * So the page is inverted. The trades are a chip rail — the same twelve
 * destinations at a fraction of the height — and what the annuaire actually
 * contains is listed underneath, which is what the visitor came for. The
 * search bar, the fastest route for anyone who already knows, follows the page
 * down instead of scrolling away.
 */

/** How many establishments to show before handing over to /recherche. */
const PREVIEW = 24;

/**
 * One trade, with how many establishments are behind it.
 *
 * Only ever rendered for a trade that has at least one. A trade with nothing
 * listed is not drawn at all — not greyed out, not labelled "bientôt": the
 * annuaire shows what it has, and says nothing about what it does not.
 */
function TradeChip({ kind, count }: { kind: ProviderKind; count: number }) {
  const meta = kindMeta(kind);

  return (
    <Link
      href={`/recherche?kind=${kind}`}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border-warm",
        "bg-card py-1.5 pl-2 pr-2.5 shadow-card",
        "transition-all duration-base ease-spring",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lifted",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          meta.chip,
        )}
      >
        <meta.Icon className={cn("h-4 w-4", meta.glyph)} />
      </span>
      <span className="text-[0.85rem] font-bold">{meta.plural}</span>
      <span className="rounded-md bg-paper-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground tnum">
        {count}
      </span>
    </Link>
  );
}

/** The small ruled label that opens a rail. */
function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary">
      <span aria-hidden className="h-px w-6 bg-primary/40" />
      {children}
    </span>
  );
}

export default async function AnnuairePage() {
  const [counts, specialties, providers] = await Promise.all([
    countProvidersByKind(),
    listSpecialties(),
    searchProviders({ limit: PREVIEW }),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Ordered by how often each is searched rather than alphabetically. Trades
  // with nothing listed are left out entirely rather than shown as empty.
  const listed = KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="bg-paper-muted">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1.5 px-4 pb-4 pt-8 sm:px-6 lg:px-8">
          <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.02em]">
            Médecins &amp; pharmacies
          </h1>
          <p className="max-w-2xl text-[0.98rem] leading-relaxed text-foreground/75">
            Tapez un nom, une spécialité ou une ville — ou choisissez un métier.
            {total > 0 ? (
              <>
                {" "}
                <span className="font-mono text-[0.88rem] tnum">
                  {total} établissement{total > 1 ? "s" : ""}
                </span>{" "}
                référencé{total > 1 ? "s" : ""}.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/*
        The bar follows the page down, pinned just under the 4.5rem header.
        It is the quickest route for anyone who already knows what they want,
        and it used to scroll out of view after the first screen. Sibling of
        the title block rather than a child of it: a sticky element only
        travels as far as its own parent does.
      */}
      <div className="sticky top-[4.5rem] z-30 border-b border-border-warm bg-paper-muted/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8">
          <SearchBar
            size="sm"
            fullWidth
            showKinds={false}
            specialties={specialties}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        {listed.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <RailLabel>Par métier</RailLabel>
            <div className="flex flex-wrap gap-2">
              {listed.map((kind) => (
                <TradeChip key={kind} kind={kind} count={counts[kind] ?? 0} />
              ))}
            </div>
          </section>
        ) : null}

        {providers.length > 0 ? (
          <Reveal>
            <section className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-[1.6rem] font-semibold tracking-[-0.02em]">
                    Les établissements référencés
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tout l&apos;annuaire, sans passer par un métier.
                  </p>
                </div>

                {total > providers.length ? (
                  <Link
                    href="/recherche"
                    className="group inline-flex h-10 items-center gap-2 rounded-xl border border-border-warm bg-card px-4 text-sm font-bold transition-colors duration-base hover:bg-paper-muted"
                  >
                    Tout voir
                    <ArrowRight className="h-4 w-4 transition-transform duration-base ease-spring group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
              </div>

              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        <Reveal>
          <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-border-warm bg-paper-muted px-6 py-5">
            <div className="flex min-w-[18rem] flex-1 flex-col gap-1">
              <h2 className="text-[1.02rem] font-bold tracking-tight">
                Un métier manque à l&apos;appel ?
              </h2>
              <p className="text-sm leading-relaxed text-foreground/75">
                L&apos;annuaire s&apos;étend au fur et à mesure que les
                établissements s&apos;inscrivent. Si vous exercez, votre fiche
                est gratuite.
              </p>
            </div>
            <Link
              href="/pro"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all duration-base ease-spring hover:brightness-110"
            >
              Inscrire mon établissement
            </Link>
          </section>
        </Reveal>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
