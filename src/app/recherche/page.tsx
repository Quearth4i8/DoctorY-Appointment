import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

import { ProviderCard } from "@/components/public/provider-card";
import { SearchBar } from "@/components/public/search-bar";
import { SearchFilters } from "@/components/public/search-filters";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import { countProvidersByKind, searchProviders } from "@/lib/providers";
import type { ProviderKind, ProviderSearchParams } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rechercher un professionnel de santé",
  description:
    "Cherchez parmi les médecins, pharmacies, laboratoires et cliniques : par métier, par ville, par disponibilité.",
};

type RawParams = Record<string, string | string[] | undefined>;

/** Always a list, whether the param appeared once, many times, or not at all. */
function many(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

const KIND_SET = new Set<string>(KIND_ORDER);

function toSearchParams(raw: RawParams): ProviderSearchParams {
  const kinds = many(raw.kind).filter((k) => KIND_SET.has(k)) as ProviderKind[];
  const q = typeof raw.q === "string" ? raw.q : undefined;
  const city = typeof raw.ou === "string" ? raw.ou : undefined;

  return {
    q,
    city,
    kinds: kinds.length ? kinds : undefined,
    openNow: raw.ouvert === "1",
    cnam: raw.cnam === "1",
    thirdParty: raw.tiers === "1",
    wheelchair: raw.pmr === "1",
    acceptingNew: raw.nouveaux === "1",
    languages: many(raw.langue).length ? many(raw.langue) : undefined,
    limit: 40,
  };
}

/** "Cardiologues à Sousse" — the heading, built from whatever was asked for. */
function heading(params: ProviderSearchParams): string {
  const kinds = params.kinds ?? [];
  const what =
    kinds.length === 1
      ? kindMeta(kinds[0]).plural
      : kinds.length > 1
        ? "Établissements"
        : params.q
          ? `Résultats pour « ${params.q} »`
          : "Tous les établissements";
  return params.city ? `${what} à ${params.city}` : what;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: RawParams;
}) {
  const params = toSearchParams(searchParams);
  const [results, counts] = await Promise.all([
    searchProviders(params),
    countProvidersByKind(),
  ]);

  const firstKind = params.kinds?.length === 1 ? params.kinds[0] : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="border-b border-border-warm bg-paper-muted">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <SearchBar
            size="sm"
            defaultQuery={params.q ?? ""}
            defaultWhere={params.city ?? ""}
            defaultKind={firstKind}
          />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <SearchFilters counts={counts} />

        <section className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-warm pb-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight">{heading(params)}</h1>
              <p className="font-mono text-xs text-muted-foreground tnum">
                {results.length === 0
                  ? "aucun résultat"
                  : `${results.length} établissement${results.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {results.map((provider) => (
                <li key={provider.id}>
                  <ProviderCard provider={provider} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}

/**
 * An empty annuaire and an over-filtered search look identical to the visitor
 * and need different advice, but this page cannot tell them apart without a
 * second query. It offers the one action that helps either way — widen — and
 * does not guess.
 */
function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-warm bg-card px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX className="h-6 w-6" />
      </span>
      <p className="text-base font-bold">Aucun établissement ne correspond</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Essayez d&apos;élargir la zone, de retirer un filtre, ou de chercher un
        métier plutôt qu&apos;un nom.
      </p>
      <Link
        href="/recherche"
        className="mt-2 inline-flex h-10 items-center rounded-xl border border-input bg-card px-4 text-sm font-bold transition-colors hover:bg-paper-muted"
      >
        Voir tout l&apos;annuaire
      </Link>
    </div>
  );
}
