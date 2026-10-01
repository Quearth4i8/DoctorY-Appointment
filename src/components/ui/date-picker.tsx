"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronDown, X } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The site's date field — a button that opens a French, Monday-first
 * calendar, styled exactly like <SelectTrigger> so every field on a form
 * looks like part of one set. Replaces <input type="date">, whose popup is
 * drawn by the browser and differs on every machine.
 *
 * Value in and out is "YYYY-MM-DD" (or "" for empty), the same string the
 * native input used, so callers swap one for the other without touching their
 * state.
 */

function toDate(key: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return undefined;
  const d = new Date(`${key}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const pickerTriggerClass = cn(
  "flex h-11 w-full items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 text-left text-[0.95rem] shadow-card transition-all duration-base ease-spring",
  "hover:border-primary/30 hover:shadow-card-hover",
  "focus:outline-none focus-visible:border-primary focus-visible:shadow-glow data-[state=open]:border-primary data-[state=open]:shadow-glow",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Choisir une date",
  clearable = false,
  disabled,
  /** Year/month dropdowns — for dates far from today, like a birth date. */
  dropdowns = false,
  /** "mer. 14 oct. 2026" instead of the full weekday and month — for narrow columns. */
  compact = false,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  dropdowns?: boolean;
  compact?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = toDate(value);
  const minDate = min ? toDate(min) : undefined;
  const maxDate = max ? toDate(max) : undefined;

  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(pickerTriggerClass, ariaInvalid && "border-destructive", className)}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 truncate", !selected && "text-muted-foreground/70")}>
            {selected
              ? format(selected, compact ? "EEE d MMM yyyy" : "EEEE d MMMM yyyy", { locale: fr })
              : placeholder}
          </span>
          {clearable && selected ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Effacer la date"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      {/* Same width as the field (never narrower than the calendar itself). */}
      <PopoverContent
        align="start"
        className="flex min-w-fit justify-center rounded-xl p-0 shadow-modal"
      >
        <Calendar
          mode="single"
          locale={fr}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? minDate ?? maxDate}
          disabled={disabledDays}
          captionLayout={dropdowns ? "dropdown" : "label"}
          startMonth={dropdowns ? new Date(1900, 0) : undefined}
          endMonth={dropdowns ? (maxDate ?? new Date(new Date().getFullYear() + 5, 11)) : undefined}
          onSelect={(d) => {
            if (!d) return;
            onChange(toKey(d));
            setOpen(false);
          }}
          className="rounded-xl bg-transparent"
          // Fixed, comfortable day size. Stretching the days to the field's
          // width made them square and huge — a wide field produced a
          // calendar taller than the screen. The panel matches the field;
          // the calendar sits centred in it.
          style={{ ["--cell-size" as string]: "2.4rem" }}
        />
      </PopoverContent>
    </Popover>
  );
}
