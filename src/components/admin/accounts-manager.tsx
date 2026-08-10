"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Globe, Loader2, UserX, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminApiError,
  fetchDoctors,
  fetchStaff,
  reassignStaff,
  revokeStaff,
  type AdminDoctor,
} from "@/lib/admin/client-api";
import { cn } from "@/lib/utils";

/** Radix Select has no concept of an empty value, so "unbound" needs a token. */
const UNBOUND = "__unbound__";

function DoctorsTable({ doctors, loading }: { doctors: AdminDoctor[] | undefined; loading: boolean }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Médecins</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !doctors?.length ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Aucun médecin pour l&apos;instant.
          </p>
        ) : (
          <div className="scrollbar-slim overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pl-4 pr-4 sm:pl-6">Médecin</th>
                  <th className="py-3 pr-4">Ville</th>
                  <th className="py-3 pr-4">Secrétaires</th>
                  <th className="py-3 pr-4">Publié</th>
                  <th className="py-3 pr-4 sm:pr-6">Application</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-4 pr-4 sm:pl-6">
                      <p className="font-medium text-foreground">
                        {d.title} {d.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.specialty || "—"} · {d.email || "sans email"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{d.city || "—"}</td>
                    <td className="py-3 pr-4 text-sm tnum text-muted-foreground">{d.staff_count}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={d.is_published ? "secondary" : "outline"}>
                        {d.is_published ? "Publié" : "Brouillon"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 sm:pr-6">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {d.paired ? (
                          <Globe className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {d.paired
                          ? d.remote_seen_at
                            ? `vue ${formatDistanceToNow(new Date(d.remote_seen_at), { addSuffix: true, locale: fr })}`
                            : "liée"
                          : "non liée"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AccountsManager() {
  const qc = useQueryClient();

  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: fetchDoctors,
  });

  const { data: staff, isLoading: loadingStaff } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: fetchStaff,
  });

  const reassign = useMutation({
    mutationFn: ({ userId, doctorId }: { userId: string; doctorId: string | null }) =>
      reassignStaff(userId, doctorId),
    onSuccess: () => {
      toast.success("Compte réaffecté.");
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
    onError: (err) =>
      toast.error(err instanceof AdminApiError ? err.message : "Réaffectation impossible."),
  });

  const revoke = useMutation({
    mutationFn: (userId: string) => revokeStaff(userId),
    onSuccess: () => {
      toast.success("Accès révoqué.");
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
    },
    onError: (err) =>
      toast.error(err instanceof AdminApiError ? err.message : "Révocation impossible."),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-foreground">
          Comptes
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Secrétaires et médecins, tous cabinets confondus.
        </p>
      </div>

      <DoctorsTable doctors={doctors} loading={loadingDoctors} />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Comptes secrétariat</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingStaff ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !staff?.length ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Aucun compte pour l&apos;instant.
            </p>
          ) : (
            <div className="scrollbar-slim overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pl-4 pr-4 sm:pl-6">Compte</th>
                    <th className="py-3 pr-4">Rôle</th>
                    <th className="py-3 pr-4">Cabinet</th>
                    <th className="py-3 pr-2 text-right sm:pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.user_id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                      <td className="py-3 pl-4 pr-4 sm:pl-6">
                        <p className="font-medium text-foreground">{s.full_name || "Sans nom"}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={s.role === "doctor" ? "default" : "secondary"}>
                          {s.role === "doctor" ? "Médecin" : "Secrétaire"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Select
                          value={s.doctor_id ?? UNBOUND}
                          onValueChange={(value) =>
                            reassign.mutate({
                              userId: s.user_id,
                              doctorId: value === UNBOUND ? null : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-9 w-56 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNBOUND}>Non lié</SelectItem>
                            {doctors?.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.title} {d.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pr-2 sm:pr-6">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Révoquer l'accès"
                            disabled={revoke.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Révoquer l'accès de ${s.full_name || s.email} ? Le compte de connexion n'est pas supprimé, seulement l'accès à l'application.`,
                                )
                              ) {
                                revoke.mutate(s.user_id);
                              }
                            }}
                          >
                            {revoke.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserX className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
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
