"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { KIND_ORDER, kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * The filter rail.
 *
 * Every control writes to the URL and nothing else. That is what makes a set
 * of filters shareable, back-button-able and server-renderable — and it means
 * this component holds no state that could disagree with what the page is
 * actually showing.
 */

const TOGGLES: { param: string; label: string }[] = [
  { param: "ouvert", label: "Ouvert maintenant" },
  { param: "cnam", label: "Conventionné CNAM" },
  { param: "tiers", label: "Tiers payant" },
  { param: "pmr", label: "Accès PMR" },
  { param: "nouveaux", label: "Prend de nouveaux patients" },
];

const LANGUAGES: { code: string; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "it", label: "Italiano" },
];

export function SearchFilters({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  /** Add or remove one value from a repeatable param. */
  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key);
      next.delete(key);
      const after = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      for (const v of after) next.append(key, v);
      push(next);
    },
    [params, push],
  );

  /** Flip a boolean param, dropping it entirely when off so URLs stay clean. */
  const toggleFlag = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      if (next.get(key) === "1") next.delete(key);
      else next.set(key, "1");
      push(next);
    },
    [params, push],
  );

  const activeKinds = params.getAll("kind");
  const activeLangs = params.getAll("langue");
  const hasAny = [...params.keys()].some((k) => k !== "q" && k !== "ou");

  /*
   * Shut on a phone, always open on a desktop.
   *
   * The rail used to sit above the results on a narrow screen: twelve trade
   * checkboxes, five switches and four language pills between the search box
   * and the first establishment. Someone looking for a doctor now had to
   * scroll past the entire taxonomy to see a single result.
   *
   * Rendered either way rather than mounted on demand, so the state of the
   * filters is in the DOM for assistive tech and nothing re-mounts when the
   * viewport crosses lg.
   */
  const [open, setOpen] = useState(false);

  /** For the phone summary: how much is currently narrowing the results. */
  const activeCount = [...params.keys()].filter((k) => k !== "q" && k !== "ou").length;

  // Zero-count trades are still listed — knowing the annuaire has no
  // opticians yet is an answer — but they are folded away so the ones that
  // can actually be picked are not buried among them.
  const kindsWithResults = KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0);
  const kindsEmpty = KIND_ORDER.filter((k) => (counts[k] ?? 0) === 0);
  const [showEmptyKinds, setShowEmptyKinds] = useState(false);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[17rem] lg:gap-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 items-center gap-2.5 rounded-xl border border-border-warm bg-card px-4 text-sm font-bold shadow-card transition-colors hover:bg-paper-muted lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        Filtres
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 font-mono text-[0.68rem] font-bold text-primary-foreground tnum">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 text-muted-foreground transition-transform duration-base",
            open && "rotate-180",
          )}
        />
      </button>

      <div className={cn("flex-col gap-6", open ? "flex" : "hidden", "lg:flex")}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold">Filtres</span>
          {hasAny ? (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams();
                const q = params.get("q");
                const ou = params.get("ou");
                if (q) next.set("q", q);
                if (ou) next.set("ou", ou);
                push(next);
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Tout effacer
            </button>
          ) : null}
        </div>

        <FilterGroup title="Type d'établissement">
          {[...kindsWithResults, ...(showEmptyKinds ? kindsEmpty : [])].map((kind) => {
            const meta = kindMeta(kind as ProviderKind);
            const on = activeKinds.includes(kind);
            const n = counts[kind] ?? 0;
            return (
              <label
                key={kind}
                className="flex cursor-pointer items-center gap-2.5 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleMulti("kind", kind)}
                  className="h-[1.05rem] w-[1.05rem] shrink-0"
                />
                <span
                  className={cn(
                    "flex-1 text-[0.82rem]",
                    on ? "font-bold" : "font-medium",
                    n === 0 && "text-muted-foreground",
                  )}
                >
                  {meta.plural}
                </span>
                <span className="font-mono text-[0.7rem] text-muted-foreground tnum">
                  {n}
                </span>
              </label>
            );
          })}

          {kindsEmpty.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowEmptyKinds((v) => !v)}
              className="mt-1 self-start text-[0.75rem] font-bold text-primary hover:underline"
            >
              {showEmptyKinds
                ? "Masquer les métiers sans résultat"
                : `Afficher ${kindsEmpty.length} métier${kindsEmpty.length > 1 ? "s" : ""} sans résultat`}
            </button>
          ) : null}
        </FilterGroup>

        <FilterGroup title="Conditions">
          {TOGGLES.map(({ param, label }) => {
            const on = params.get(param) === "1";
            return (
              <button
                key={param}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggleFlag(param)}
                className="flex items-center gap-3 py-1 text-left"
              >
                <span className="flex-1 text-[0.82rem]">{label}</span>
                <span
                  className={cn(
                    "flex h-[1.45rem] w-10 shrink-0 items-center rounded-full p-[0.15rem] transition-colors",
                    on ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-[1.15rem] w-[1.15rem] rounded-full bg-card shadow-sm transition-transform",
                      on && "translate-x-[1.4rem]",
                    )}
                  />
                </span>
              </button>
            );
          })}
        </FilterGroup>

        <FilterGroup title="Langues parlées">
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map(({ code, label }) => {
              const on = activeLangs.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleMulti("langue", code)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-[0.78rem] font-semibold transition-colors",
                    on
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border-warm bg-card text-foreground/75 hover:bg-paper-muted",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      </div>
    </aside>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border-warm pt-5 first-of-type:border-0 first-of-type:pt-0">
      <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  );
}
