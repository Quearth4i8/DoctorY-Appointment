"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Specialty } from "@/types";

/**
 * Specialties as a search-and-tag field.
 *
 * This replaced a wall of forty toggle buttons. Forty is too many to read, and
 * reading all of them was the only way to find out whether yours was there.
 * Typing three letters is faster than scanning six rows, and it degrades
 * gracefully: what you type either matches the taxonomy, or becomes your own
 * entry.
 *
 * A custom tag is not a second-class one to the patient — it reaches search
 * exactly like a curated tag does — but it is kept out of the taxonomy itself,
 * so one practice's spelling never becomes everybody's filter option. The
 * badge on it is there so the doctor can see which of theirs is off-list.
 */

/** Fold case and accents so "diabeto" finds "Diabétologie". */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type SpecialtyValue = {
  /** Slugs from the closed taxonomy. */
  slugs: string[];
  /** Free-text entries this practice added itself. */
  custom: string[];
};

export function SpecialtyTagInput({
  options,
  value,
  onChange,
  max = 8,
}: {
  options: Specialty[];
  value: SpecialtyValue;
  onChange: (next: SpecialtyValue) => void;
  max?: number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const total = value.slugs.length + value.custom.length;
  const full = total >= max;

  const bySlug = useMemo(
    () => new Map(options.map((o) => [o.slug, o])),
    [options],
  );

  /** Taxonomy matches on label or synonym, minus what is already chosen. */
  const matches = useMemo(() => {
    const q = fold(query);
    if (!q) return [];
    return options
      .filter((o) => !value.slugs.includes(o.slug))
      .filter(
        (o) =>
          fold(o.label).includes(q) ||
          (o.synonyms ?? []).some((syn) => fold(syn).includes(q)),
      )
      .slice(0, 8);
  }, [options, query, value.slugs]);

  // Offer "add it anyway" only when nothing in the taxonomy is an exact match,
  // so nobody creates a custom "Cardiologie" beside the real one.
  const exact = useMemo(() => {
    const q = fold(query);
    return (
      options.some((o) => fold(o.label) === q) ||
      value.custom.some((c) => fold(c) === q)
    );
  }, [options, query, value.custom]);

  const canAddCustom = query.trim().length >= 2 && !exact;
  const rows = matches.length + (canAddCustom ? 1 : 0);

  function addSlug(slug: string) {
    if (full || value.slugs.includes(slug)) return;
    onChange({ ...value, slugs: [...value.slugs, slug] });
    reset();
  }

  function addCustom(label: string) {
    const clean = label.trim().slice(0, 60);
    if (!clean || full) return;
    if (value.custom.some((c) => fold(c) === fold(clean))) return;
    onChange({ ...value, custom: [...value.custom, clean] });
    reset();
  }

  function reset() {
    setQuery("");
    setCursor(0);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // never submit the settings form from here
      if (cursor < matches.length) addSlug(matches[cursor].slug);
      else if (canAddCustom) addCustom(query);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => (rows ? (c + 1) % rows : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (rows ? (c - 1 + rows) % rows : 0));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    // Backspace on an empty box removes the last tag — the usual behaviour of
    // a field like this, and quicker than aiming for a small ×.
    if (e.key === "Backspace" && !query) {
      if (value.custom.length) {
        onChange({ ...value, custom: value.custom.slice(0, -1) });
      } else if (value.slugs.length) {
        onChange({ ...value, slugs: value.slugs.slice(0, -1) });
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {total > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.slugs.map((slug) => (
            <Tag
              key={slug}
              label={bySlug.get(slug)?.label ?? slug}
              onRemove={() =>
                onChange({
                  ...value,
                  slugs: value.slugs.filter((s) => s !== slug),
                })
              }
            />
          ))}
          {value.custom.map((label) => (
            <Tag
              key={`custom:${label}`}
              label={label}
              custom
              onRemove={() =>
                onChange({
                  ...value,
                  custom: value.custom.filter((c) => c !== label),
                })
              }
            />
          ))}
        </div>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={full}
          placeholder={
            full
              ? `Maximum de ${max} spécialités atteint`
              : "Tapez une spécialité — diabétologie, sexologie…"
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // A click on a suggestion must land before the list closes.
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-10 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none",
            "transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />

        {open && rows > 0 ? (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-border/70 bg-card p-1 shadow-lifted"
          >
            {matches.map((o, i) => (
              <li key={o.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => addSlug(o.slug)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === cursor ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="font-medium">{o.label}</span>
                  {o.synonyms?.length ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {o.synonyms.slice(0, 2).join(", ")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}

            {canAddCustom ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={cursor === matches.length}
                  onMouseEnter={() => setCursor(matches.length)}
                  onClick={() => addCustom(query)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
                    cursor === matches.length ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="text-muted-foreground">Ajouter</span>
                  <span className="font-semibold">
                    &laquo;&nbsp;{query.trim()}&nbsp;&raquo;
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Entrée
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {total}/{max} — tapez pour chercher, Entrée pour ajouter. Si votre
        spécialité n&apos;est pas dans la liste, écrivez-la et ajoutez-la
        telle quelle.
      </p>
    </div>
  );
}

function Tag({
  label,
  custom = false,
  onRemove,
}: {
  label: string;
  custom?: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-[0.8rem] font-medium",
        custom
          ? "border border-dashed border-primary/50 bg-primary/5 text-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {label}
      {custom ? (
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
          perso
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${label}`}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
          custom ? "hover:bg-primary/15" : "hover:bg-primary-foreground/20",
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
