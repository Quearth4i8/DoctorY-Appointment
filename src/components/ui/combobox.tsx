"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fold, rank, type MatchOption } from "@/lib/match";
import { cn } from "@/lib/utils";

/** Re-exported so consumers import one name, not two. */
export type ComboboxOption = MatchOption;

/** Above this many rows we stop rendering and ask for a narrower search. */
const RENDER_CAP = 80;

/**
 * The same matching, in the shape of a plain text input.
 *
 * Search boxes want typeahead, not a trigger: the visitor is already typing,
 * and a button that must be clicked open before it accepts a letter would be a
 * step backwards. So this suggests underneath without ever standing between
 * someone and their own words — Enter submits the form as usual unless they
 * have actually arrowed onto a suggestion.
 */
export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  id,
  className,
  onPick,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (ComboboxOption | string)[];
  placeholder?: string;
  id?: string;
  className?: string;
  onPick?: (value: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  // -1 means "nothing chosen", which is what lets Enter submit the form.
  const [active, setActive] = React.useState(-1);
  const reactId = React.useId();
  const listId = `${id ?? reactId}-ac`;

  const normalized = React.useMemo<ComboboxOption[]>(
    () =>
      options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [options],
  );

  const needle = fold(value);
  const matches = React.useMemo(
    () => (needle.length < 1 ? [] : rank(normalized, needle).slice(0, 8)),
    [normalized, needle],
  );

  // An exact hit means the box already says what the list would offer.
  const exact = normalized.some((o) => fold(o.label) === needle);
  const open = focused && matches.length > 0 && !exact;

  React.useEffect(() => setActive(-1), [value]);

  const pick = (next: string) => {
    onChange(next);
    onPick?.(next);
    setFocused(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        // Deferred: a click on a suggestion fires blur first, and closing the
        // list here and now would unmount the row mid-click.
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            // Only swallow the submit when a suggestion is genuinely
            // highlighted — otherwise Enter must still run the search.
            e.preventDefault();
            pick(matches[active].value);
          } else if (e.key === "Escape") {
            setFocused(false);
          }
        }}
        className={className}
      />

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-50 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-modal"
        >
          {matches.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option.value);
              }}
              onMouseMove={() => setActive(index)}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-[0.85rem] font-medium transition-colors duration-fast",
                index === active && "bg-accent text-accent-foreground",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.hint ? (
                <span className="shrink-0 truncate text-[0.7rem] font-normal text-muted-foreground">
                  {option.hint}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  searchPlaceholder = "Rechercher…",
  emptyLabel = "Aucun résultat",
  /**
   * Accept whatever was typed, even when it matches nothing.
   *
   * On for open lists (a city we have never heard of is still a real city),
   * off for closed ones (there are 24 governorates and no 25th).
   */
  allowCustom = false,
  clearable = true,
  disabled,
  id,
  className,
  contentClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (ComboboxOption | string)[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  const reactId = React.useId();
  const listId = `${id ?? reactId}-list`;

  const normalized = React.useMemo<ComboboxOption[]>(
    () =>
      options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [options],
  );

  const needle = fold(query);

  const matches = React.useMemo(
    () => rank(normalized, needle),
    [normalized, needle],
  );

  const shown = matches.slice(0, RENDER_CAP);

  // Offering the raw text as its own row would be noise when it already IS
  // one of the options, so only when it is genuinely new.
  const custom =
    allowCustom &&
    query.trim().length > 0 &&
    !normalized.some((o) => fold(o.label) === needle);

  const rowCount = shown.length + (custom ? 1 : 0);
  const selected = normalized.find((o) => o.value === value);

  // Typing changes what the rows are, so the highlight has to come back to the
  // top or it ends up pointing at whatever happens to occupy that index now.
  React.useEffect(() => setActive(0), [query]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Keep the highlighted row on screen when arrowing past the fold.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (rowCount === 0 ? 0 : (i + 1) % rowCount));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (rowCount === 0 ? 0 : (i - 1 + rowCount) % rowCount));
    } else if (event.key === "Enter") {
      // Inside a <form>, Enter would otherwise submit it from here.
      event.preventDefault();
      if (active < shown.length) commit(shown[active].value);
      else if (custom) commit(query.trim());
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, rowCount - 1));
    }
  };

  const triggerLabel = selected?.label ?? (value || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          className={cn(
            "group flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-card px-3.5 text-left text-[0.95rem] shadow-card transition-all duration-base ease-spring",
            "hover:border-primary/30 hover:shadow-card-hover",
            "focus:border-primary focus:shadow-glow focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span
            className={cn(
              "flex-1 truncate",
              !triggerLabel && "text-muted-foreground/70",
            )}
          >
            {triggerLabel || placeholder}
          </span>

          {clearable && value && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Effacer"
              onClick={(e) => {
                // The clear affordance sits inside the trigger, so without
                // this the click also opens the list it just emptied.
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        onKeyDown={onKeyDown}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[13rem] overflow-hidden rounded-xl border border-border bg-popover p-0 shadow-modal",
          contentClassName,
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-autocomplete="list"
            aria-controls={listId}
            className="h-10 flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-64 overflow-y-auto overscroll-contain p-1.5 scrollbar-slim"
        >
          {rowCount === 0 ? (
            <p className="px-3 py-6 text-center text-[0.85rem] text-muted-foreground">
              {emptyLabel}
            </p>
          ) : null}

          {shown.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                key={`${option.value}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(option.value)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-3 pr-2.5 text-[0.9rem] transition-colors duration-fast",
                  index === active && "bg-accent text-accent-foreground",
                  isSelected &&
                    "bg-primary-soft font-bold text-primary-soft-foreground",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="truncate text-[0.72rem] font-normal text-muted-foreground">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </div>
            );
          })}

          {custom ? (
            <div
              data-index={shown.length}
              role="option"
              aria-selected={false}
              onClick={() => commit(query.trim())}
              onMouseMove={() => setActive(shown.length)}
              className={cn(
                "mt-0.5 flex cursor-pointer select-none items-center gap-2 rounded-md border-t border-border px-3 py-2 text-[0.85rem] transition-colors duration-fast",
                shown.length === active && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate text-muted-foreground">
                Utiliser «&nbsp;
                <span className="font-semibold text-foreground">
                  {query.trim()}
                </span>
                &nbsp;»
              </span>
            </div>
          ) : null}

          {matches.length > RENDER_CAP ? (
            <p className="px-3 py-2 text-center text-[0.72rem] text-muted-foreground">
              {matches.length - RENDER_CAP} autres — précisez votre recherche
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
