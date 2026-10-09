"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Minus, Plus, Timer } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DURATION_MAX,
  DURATION_MIN,
  DURATION_OPTIONS,
  clampDuration,
  durationLabel,
} from "@/lib/scheduler";
import { cn } from "@/lib/utils";

/**
 * How long an appointment lasts. A fixed list of 15/30/45… did not fit the
 * cabinet: a renewal takes ten minutes, a first visit can take fifty. So the
 * common lengths are one click away, and any other length (5 to 480 min, the
 * limit the database enforces) can be typed or stepped to.
 */
export function DurationPicker({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (minutes: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // What is in the box while typing; committed on blur / Enter.
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) onChange(clampDuration(n));
    else setDraft(String(value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3.5 text-[0.95rem] shadow-card transition-all duration-base ease-spring",
            "hover:border-primary/30 hover:shadow-card-hover",
            "focus:outline-none focus:border-primary focus:shadow-glow",
            "data-[state=open]:border-primary data-[state=open]:shadow-glow",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate tnum">{durationLabel(value)}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[17rem] rounded-xl p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Durées courantes
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {DURATION_OPTIONS.map((d) => {
            const selected = d === value;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                className={cn(
                  "h-9 rounded-lg text-sm font-medium tnum transition-all duration-150",
                  selected
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {durationLabel(d, true)}
              </button>
            );
          })}
        </div>

        <div className="my-3 h-px bg-border" />

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Autre durée
        </p>
        <div className="flex items-center gap-1.5">
          <StepButton
            label="5 minutes de moins"
            disabled={value <= DURATION_MIN}
            onClick={() => onChange(clampDuration(value - 5))}
          >
            <Minus className="h-4 w-4" />
          </StepButton>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              min={DURATION_MIN}
              max={DURATION_MAX}
              step={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(draft);
                  setOpen(false);
                }
              }}
              aria-label="Durée en minutes"
              className="h-9 w-full rounded-lg border border-input bg-card pl-3 pr-11 text-center text-sm font-semibold tnum shadow-inner-sm [appearance:textfield] focus:border-primary focus:shadow-glow focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              min
            </span>
          </div>
          <StepButton
            label="5 minutes de plus"
            disabled={value >= DURATION_MAX}
            onClick={() => onChange(clampDuration(value + 5))}
          >
            <Plus className="h-4 w-4" />
          </StepButton>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          De {DURATION_MIN} min à {DURATION_MAX / 60} h.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
