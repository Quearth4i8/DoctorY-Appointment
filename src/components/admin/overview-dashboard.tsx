"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  Inbox,
  KeyRound,
  Laptop,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAppStats, fetchRequestsOverTime } from "@/lib/admin/client-api";
import { RequestsChart } from "./requests-chart";

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  href?: string;
}) {
  const content = (
    <Card className="h-full border-border/70 transition-colors hover:border-primary/30">
      <CardContent className="flex items-center gap-3.5 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          {value === undefined ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="tnum text-2xl font-bold leading-none tracking-tight text-foreground">
              {value}
            </p>
          )}
          <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

export function OverviewDashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAppStats });
  const { data: requestsByDay } = useQuery({
    queryKey: ["admin-requests-over-time"],
    queryFn: fetchRequestsOverTime,
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          L&apos;état de DoctorY, tous cabinets confondus.
        </p>
      </div>

      <Section title="Cabinets">
        <StatTile icon={Stethoscope} label="Médecins" value={stats?.doctors_total} href="/admin/comptes" />
        <StatTile icon={CalendarCheck} label="Profils publiés" value={stats?.doctors_published} href="/admin/comptes" />
        <StatTile icon={Users} label="Comptes secrétariat" value={stats?.staff_total} href="/admin/comptes" />
        <StatTile icon={KeyRound} label="Clés / machines actives" value={stats?.license_machines_total} href="/admin/licences" />
      </Section>

      <Section title="Demandes de rendez-vous">
        <StatTile icon={Inbox} label="Total" value={stats?.requests_total} />
        <StatTile icon={CalendarClock} label="En attente" value={stats?.requests_pending} />
        <StatTile icon={UserCheck} label="Acceptées" value={stats?.requests_accepted} />
        <StatTile icon={Inbox} label="Refusées" value={stats?.requests_refused} />
      </Section>

      <Section title="Rendez-vous & patients">
        <StatTile icon={CalendarCheck} label="Rendez-vous totaux" value={stats?.appointments_total} />
        <StatTile icon={CalendarClock} label="À venir" value={stats?.appointments_upcoming} />
        <StatTile icon={Users} label="Patients (front-desk)" value={stats?.patients_total} />
        <StatTile icon={Laptop} label="Clés de licence émises" value={stats?.license_keys_total} href="/admin/licences" />
      </Section>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Demandes de rendez-vous — 60 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestsChart data={requestsByDay ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
