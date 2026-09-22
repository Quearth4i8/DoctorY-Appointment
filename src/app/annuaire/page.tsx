import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/public/reveal";
import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SearchBar } from "@/components/public/search-bar";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { KIND_GROUPS, kindMeta } from "@/lib/provider-kinds";
import { countProvidersByKind, listSpecialties } from "@/lib/providers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "L'annuaire de la santé",
  description:
    "Tous les métiers référencés sur DoctorY : médecins, dentistes, pharmacies, laboratoires, cliniques, opticiens, infirmiers et sages-femmes.",
};

/**
 * The catalogue.
 *
 * This exists because twelve trades cannot live in a navbar. There they fit
 * four at a time, repeated the filter rail on the results page, and grew every
 * time a trade was added. Here each one gets a line saying what you actually
 * go there for, and they are grouped by what brought you rather than by any
 * administrative category.
 */
export default async function AnnuairePage() {
  const [counts, specialties] = await Promise.all([
    countProvidersByKind(),
    listSpecialties(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <div className="border-b border-border-warm bg-paper-muted">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[2.4rem] font-semibold leading-tight">
              L&apos;annuaire de la santé
            </h1>
            <p className="max-w-2xl text-[1.02rem] leading-relaxed text-foreground/75">
              Choisissez un métier, ou cherchez directement par nom, spécialité
              ou ville.
              {total > 0 ? (
                <>
                  {" "}
                  <span className="font-mono text-[0.9rem] tnum">
                    {total} établissement{total > 1 ? "s" : ""}
                  </span>{" "}
                  référencé{total > 1 ? "s" : ""}.
                </>
              ) : null}
            </p>
          </div>

          <SearchBar size="sm" fullWidth showKinds={false} specialties={specialties} />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        {KIND_GROUPS.map((group, groupIndex) => (
          <Reveal key={group.title} delay={groupIndex}>
            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-bold tracking-tight">{group.title}</h2>
                <p className="text-sm text-muted-foreground">{group.note}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.kinds.map((kind) => {
                  const meta = kindMeta(kind);
                  const n = counts[kind] ?? 0;
                  // Nothing listed yet is said plainly rather than shown as a
                  // confident "0" — the trade is coming, not empty.
                  const listed = n > 0;

                  return (
                    <Link
                      key={kind}
                      href={`/recherche?kind=${kind}`}
                      className={cn(
                        "group flex flex-col gap-3 rounded-xl border border-border-warm bg-card p-5",
                        "transition-all duration-slow ease-spring",
                        "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lifted",
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-xl",
                            meta.chip,
                          )}
                        >
                          <meta.Icon className={cn("h-5 w-5", meta.glyph)} />
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[0.7rem] tnum",
                            listed ? "text-muted-foreground" : "text-muted-foreground/60",
                          )}
                        >
                          {listed ? `${n} fiche${n > 1 ? "s" : ""}` : "bientôt"}
                        </span>
                      </span>

                      <span className="flex flex-col gap-1">
                        <span className="text-[0.95rem] font-bold">{meta.plural}</span>
                        <span className="text-[0.82rem] leading-relaxed text-muted-foreground">
                          {meta.blurb}
                        </span>
                      </span>

                      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[0.8rem] font-bold text-primary">
                        Parcourir
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-base ease-spring group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          </Reveal>
        ))}

        <Reveal>
          <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-border-warm bg-paper-muted px-7 py-6">
            <div className="flex min-w-[18rem] flex-1 flex-col gap-1.5">
              <h2 className="text-lg font-bold tracking-tight">
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
