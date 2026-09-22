"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Laptop, ShieldAlert, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllActivations, fetchLicenses } from "@/lib/admin/client-api";
import { ActivationsChart } from "./activations-chart";
import { CreateLicenseDialog } from "./create-license-dialog";
import { LicenseRow } from "./license-row";

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3.5 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="tnum text-2xl font-bold leading-none tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LicenseDashboard() {
  const {
    data: licenses,
    isLoading: loadingLicenses,
  } = useQuery({ queryKey: ["admin-licenses"], queryFn: fetchLicenses });

  const { data: allActivations } = useQuery({
    queryKey: ["admin-activations-all"],
    queryFn: fetchAllActivations,
  });

  const stats = useMemo(() => {
    const list = licenses ?? [];
    const now = new Date();
    return {
      total: list.length,
      machines: list.reduce((sum, l) => sum + l.activation_count, 0),
      atLimit: list.filter((l) => !l.revoked && l.activation_count >= l.max_activations)
        .length,
      inactive: list.filter(
        (l) => l.revoked || (l.expires_at && new Date(l.expires_at) < now),
      ).length,
    };
  }, [licenses]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
            Licences
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Clés d&apos;activation et machines par médecin.
          </p>
        </div>
        <CreateLicenseDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={KeyRound}
          label="Clés émises"
          value={stats.total}
          tint="bg-accent text-accent-foreground"
        />
        <StatTile
          icon={Laptop}
          label="Machines activées"
          value={stats.machines}
          tint="bg-accent text-accent-foreground"
        />
        <StatTile
          icon={ShieldAlert}
          label="Clés au maximum"
          value={stats.atLimit}
          tint="bg-warn-soft text-warn-foreground dark:bg-warn/15 dark:text-warn"
        />
        <StatTile
          icon={ShieldCheck}
          label="Révoquées / expirées"
          value={stats.inactive}
          tint="bg-destructive/10 text-destructive"
        />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Activations dans le temps</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivationsChart activations={allActivations ?? []} />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Toutes les clés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLicenses ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !licenses?.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucune clé pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 py-3 pl-2" />
                    <th className="py-3 pr-4">Médecin</th>
                    <th className="py-3 pr-4">Machines</th>
                    <th className="py-3 pr-4">Expiration</th>
                    <th className="py-3 pr-4">Statut</th>
                    <th className="py-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => (
                    <LicenseRow key={license.key} license={license} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
