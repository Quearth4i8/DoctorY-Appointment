"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import type { LicenseActivation } from "@/lib/admin/client-api";

/** Cumulative count of distinct machine activations, one point per day. */
function toCumulativeSeries(activations: LicenseActivation[]) {
  if (activations.length === 0) return [];

  const byDay = new Map<string, number>();
  for (const a of activations) {
    const day = a.activated_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const days = [...byDay.keys()].sort();
  let running = 0;
  return days.map((day) => {
    running += byDay.get(day)!;
    return { day, total: running };
  });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { day: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-card-hover">
      <p className="text-xs text-muted-foreground">
        {format(parseISO(point.payload.day), "d MMMM yyyy", { locale: fr })}
      </p>
      <p className="font-semibold text-foreground">
        {point.value} activation{point.value > 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function ActivationsChart({ activations }: { activations: LicenseActivation[] }) {
  const data = useMemo(() => toCumulativeSeries(activations), [activations]);

  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Pas encore assez de données pour un graphique.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="activationsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="day"
          tickFormatter={(d: string) => format(parseISO(d), "d MMM", { locale: fr })}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
          minTickGap={24}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#activationsFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
