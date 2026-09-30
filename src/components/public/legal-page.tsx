import Link from "next/link";

import { ScrollToTop } from "@/components/public/scroll-to-top";
import { SiteFooter, SiteHeader } from "@/components/public/site-chrome";
import { LEGAL_PAGES, LEGAL_UPDATED, formatLegalDate } from "@/lib/legal";
import { cn } from "@/lib/utils";

/**
 * The frame every legal text shares: title, last-updated date, a table of
 * contents built from the sections, and links across to the other texts.
 *
 * Sections are numbered and anchored so a support reply can point at
 * "/conditions-utilisation#responsabilite" instead of pasting paragraphs.
 */

export type LegalSectionDef = { id: string; title: string; body: React.ReactNode };

export function LegalPage({
  title,
  intro,
  current,
  sections,
  children,
}: {
  title: string;
  intro: React.ReactNode;
  /** This page's href, to mark it in the cross-links. */
  current: string;
  sections: LegalSectionDef[];
  /** Anything shown above the numbered sections (summary cards…). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-primary">
          Informations légales
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.025em]">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : {formatLegalDate(LEGAL_UPDATED)}
        </p>
        <div className="mt-4 max-w-3xl text-[1.02rem] leading-relaxed text-foreground/75">{intro}</div>

        {children ? <div className="mt-10">{children}</div> : null}

        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav aria-label="Sommaire" className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Sommaire
            </p>
            <ol className="flex flex-col gap-1 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-2 rounded-lg px-2 py-1 text-foreground/70 transition-colors hover:bg-paper-muted hover:text-foreground"
                  >
                    <span className="font-mono text-xs text-muted-foreground tnum">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-8">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-lg font-bold">
                  <span className="mr-2 font-mono text-sm text-primary tnum">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="legal-body mt-2 flex flex-col gap-3 text-[0.95rem] leading-relaxed text-foreground/80">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </div>

        <nav
          aria-label="Autres informations légales"
          className="mt-14 flex flex-wrap gap-2 border-t border-border-warm pt-6"
        >
          {LEGAL_PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              aria-current={p.href === current ? "page" : undefined}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                p.href === current
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border-warm bg-card hover:bg-paper-muted",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </main>

      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}

/** A bulleted list with the page's spacing. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-primary/60">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** A mailto link to the publisher, styled like the rest of the body. */
export function MailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className="font-semibold text-primary underline-offset-4 hover:underline">
      {email}
    </a>
  );
}
