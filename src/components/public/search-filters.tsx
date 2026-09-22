"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[17rem]">
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
        {KIND_ORDER.map((kind) => {
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
                className={cn("flex-1 text-[0.82rem]", on ? "font-bold" : "font-medium")}
              >
                {meta.plural}
              </span>
              <span className="font-mono text-[0.7rem] text-muted-foreground tnum">
                {n}
              </span>
            </label>
          );
        })}
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
