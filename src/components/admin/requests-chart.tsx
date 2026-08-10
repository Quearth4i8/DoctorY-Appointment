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

import type { AdminRequestsByDay } from "@/lib/admin/client-api";

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
        {point.value} demande{point.value > 1 ? "s" : ""}
      </p>
    </div>
  );
}

/** Daily count, not cumulative — unlike the license chart, a flat week is a
 * meaningful signal here (nobody's requesting appointments), so summing it
 * away into a growth curve would hide exactly what's worth noticing. */
export function RequestsChart({ data }: { data: AdminRequestsByDay[] }) {
  const points = useMemo(() => data.map((d) => ({ day: d.day, count: d.count })), [data]);

  if (points.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Pas encore assez de données pour un graphique.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="requestsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
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
          dataKey="count"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#requestsFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
