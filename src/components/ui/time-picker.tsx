"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The site's time field: the same Select as everywhere else, listing times at
 * a fixed step. Replaces <input type="time">, whose spinner and AM/PM display
 * follow the visitor's operating system (the settings page showed "09:00 AM"
 * to a doctor who works on a 24-hour clock).
 *
 * Value in and out is "HH:mm" (or "" for empty). A value off the step —
 * 09:10 saved before this picker existed — is kept and listed, never rounded
 * away behind the user's back.
 */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toLabel(min: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  step = 15,
  from = "06:00",
  to = "23:45",
  placeholder = "--:--",
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Minutes between two listed times. */
  step?: number;
  /** First and last time listed. */
  from?: string;
  to?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options = React.useMemo(() => {
    const list: string[] = [];
    for (let m = toMinutes(from); m <= toMinutes(to); m += step) list.push(toLabel(m));
    if (/^\d{2}:\d{2}$/.test(value) && !list.includes(value)) {
      list.push(value);
      list.sort();
    }
    return list;
  }, [from, to, step, value]);

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={cn("tnum", className)}>
        {/* A div, not a span: SelectTrigger line-clamps its direct <span>
            children, which turns this row into a column (icon above time). */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            <SelectValue placeholder={placeholder} />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options.map((t) => (
          <SelectItem key={t} value={t} className="tnum">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * A date and a time side by side, for what used to be
 * <input type="datetime-local">. Value in and out is "YYYY-MM-DDTHH:mm".
 */
export function DateTimeFields({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [date = "", time = ""] = (value || "").split("T");
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2", className)}>
      <DatePicker value={date} onChange={(d) => onChange(d ? `${d}T${time || "08:00"}` : "")} clearable />
      <TimePicker
        value={time.slice(0, 5)}
        onChange={(t) => onChange(`${date || new Date().toISOString().slice(0, 10)}T${t}`)}
        from="00:00"
        to="23:30"
        step={30}
      />
    </div>
  );
}
