"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { AutocompleteInput, type ComboboxOption } from "@/components/ui/combobox";
import { KIND_ORDER, KIND_TABS, kindMeta } from "@/lib/provider-kinds";
import { ALL_CITY_OPTIONS, GOVERNORATES } from "@/lib/tunisia";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * Everywhere worth typing into "Où".
 *
 * Governorates come first so that someone who means the whole region gets the
 * region, not its capital — both are spelled "Sfax", and the caption is what
 * tells them apart.
 */
/** Hoisted so the default prop is the SAME array every render, which is what
 *  keeps the memo below from recomputing on every keystroke. */
const NO_SPECIALTIES: { label: string; synonyms?: string[] }[] = [];

const WHERE_OPTIONS: ComboboxOption[] = [
  ...GOVERNORATES.map((g) => ({
    value: g,
    label: g,
    hint: "Gouvernorat",
  })),
  ...ALL_CITY_OPTIONS,
];

/**
 * The annuaire's front door: what, where, and which trade.
 *
 * A plain `<form>` with a real submit, so Enter works from either field and
 * the whole thing degrades to a normal navigation. The kind tabs are a
 * pre-filter rather than a separate search: picking "Pharmacie" narrows the
 * same query instead of sending the visitor somewhere else.
 */
export function SearchBar({
  defaultQuery = "",
  defaultWhere = "",
  defaultKind = null,
  size = "lg",
  /*
   * The quick trade tabs.
   *
   * They earn their place on the landing page, where scoping before you type
   * saves a trip. On the results page they are the third control for one
   * decision — the header nav, these, and the filter rail's "Type
   * d'établissement" all set the same thing — so that page turns them off and
   * lets the rail own it.
   */
  showKinds = true,
  /** Fill the container instead of sitting in a reading-width column. */
  fullWidth = false,
  /*
   * The specialty taxonomy, for suggesting under "Qui ou quoi".
   *
   * Passed in rather than fetched here because this is a client component and
   * the list lives in the database. Pages that have it already send it; the
   * rest still get the trade names below, which always resolve to something.
   */
  specialties = NO_SPECIALTIES,
  /*
   * Extra classes for the bar itself, not the wrapper.
   *
   * The landing hero sits the bar on a tinted wash where `shadow-card`'s
   * hairline disappears, so that one page lifts it. Everywhere else the
   * default is what keeps the control looking the same on /recherche as it
   * does on a profile.
   */
  className,
}: {
  defaultQuery?: string;
  defaultWhere?: string;
  defaultKind?: ProviderKind | null;
  size?: "lg" | "sm";
  showKinds?: boolean;
  fullWidth?: boolean;
  specialties?: { label: string; synonyms?: string[] }[];
  className?: string;
}) {
  const router = useRouter();
  const current = useSearchParams();
  const [kind, setKind] = useState<ProviderKind | null>(defaultKind);
  const [q, setQ] = useState(defaultQuery);
  const [where, setWhere] = useState(defaultWhere);

  /*
   * Specialties first, trades after.
   *
   * Someone typing "card" means cardiologue, not "cabinet"; the trades are the
   * safety net for an empty taxonomy, not the headline. Synonyms ride along as
   * hidden keywords so "labo" reaches "Laboratoire d'analyses" and "coeur"
   * reaches "Cardiologie".
   */
  const whatOptions = useMemo<ComboboxOption[]>(
    () => [
      ...specialties.map((s) => ({
        value: s.label,
        label: s.label,
        hint: "Spécialité",
        keywords: (s.synonyms ?? []).join(" "),
      })),
      ...KIND_ORDER.map((k) => {
        const meta = kindMeta(k);
        return {
          value: meta.plural,
          label: meta.plural,
          hint: "Métier",
          keywords: meta.label,
        };
      }),
    ],
    [specialties],
  );

  /*
   * Rewrites only what this bar owns and leaves the rest of the URL alone.
   *
   * It used to build a fresh query string, which silently threw away every
   * filter in the rail: set "ouvert maintenant" and "conventionné CNAM",
   * correct a typo in the search box, and all of it was gone. The URL is the
   * shared state here, so this edits it rather than replacing it.
   */
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(current.toString());

    next.delete("q");
    next.delete("ou");
    if (q.trim()) next.set("q", q.trim());
    if (where.trim()) next.set("ou", where.trim());

    // Only touch `kind` when the tabs are actually on screen. With them
    // hidden, the rail owns the trade filter — and it can hold several, which
    // a single-value control here could only ever flatten to one.
    if (showKinds) {
      next.delete("kind");
      if (kind) next.set("kind", kind);
    }

    const qs = next.toString();
    router.push(qs ? `/recherche?${qs}` : "/recherche");
  }

  const tall = size === "lg";

  return (
    <div className="flex flex-col gap-4">
      {showKinds ? (
        <div className="flex flex-wrap gap-1.5">
          <KindTab active={kind === null} onClick={() => setKind(null)} label="Tout" />
          {KIND_TABS.map((k) => {
            const meta = kindMeta(k);
            return (
              <KindTab
                key={k}
                active={kind === k}
                onClick={() => setKind(k)}
                label={meta.label}
                Icon={meta.Icon}
              />
            );
          })}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className={cn(
          "flex items-center gap-1.5 rounded-2xl border border-border-warm bg-card p-2.5 shadow-card",
          fullWidth ? "w-full" : tall ? "max-w-[39rem]" : "max-w-[34rem]",
          className,
        )}
      >
        <Field
          id="q-quoi"
          label="Qui ou quoi"
          placeholder="Cardiologue, pharmacie, NFS…"
          value={q}
          onChange={setQ}
          options={whatOptions}
          icon={<Search className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />}
          grow="flex-[1.3]"
        />

        <span className="h-9 w-px shrink-0 bg-border-warm" />

        <Field
          id="q-ou"
          label="Où"
          placeholder="Ville ou gouvernorat"
          value={where}
          onChange={setWhere}
          options={WHERE_OPTIONS}
          icon={<MapPin className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />}
          grow="flex-1"
        />

        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-all hover:brightness-110",
            tall ? "h-12 px-6 text-[0.95rem]" : "h-11 px-5 text-sm",
          )}
        >
          <Search className="h-[1.05rem] w-[1.05rem]" />
          <span className="hidden sm:inline">Chercher</span>
        </button>
      </form>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] transition-colors",
        active
          ? "border-foreground bg-foreground font-bold text-background"
          : "border-border-warm bg-card font-semibold text-foreground/75 hover:bg-paper-muted",
      )}
    >
      {Icon ? <Icon className="h-[0.95rem] w-[0.95rem]" /> : null}
      {label}
    </button>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  icon,
  grow,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly ComboboxOption[];
  icon: React.ReactNode;
  grow: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5 px-3", grow)}>
      <span className="shrink-0">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <label
          htmlFor={id}
          className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        <AutocompleteInput
          id={id}
          value={value}
          onChange={onChange}
          options={options}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent p-0 text-[0.9rem] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
        />
      </span>
    </div>
  );
}
