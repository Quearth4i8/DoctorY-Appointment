"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarClock,
  Check,
  IdCard,
  Inbox,
  Loader2,
  Phone,
  ShieldCheck,
  StickyNote,
  Sun,
  Sunset,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, fetchRequests, refuseRequest } from "@/lib/client-api";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { AppointmentRequest, RequestStatus } from "@/types";
import { AcceptRequestDialog } from "./accept-request-dialog";

const TABS: { value: RequestStatus | "toutes"; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "accepte", label: "Acceptées" },
  { value: "refuse", label: "Refusées" },
  { value: "toutes", label: "Toutes" },
];

const STATUS_BADGE: Record<RequestStatus, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-amber-100 text-amber-700" },
  accepte: { label: "Acceptée", className: "bg-emerald-100 text-emerald-700" },
  refuse: { label: "Refusée", className: "bg-rose-100 text-rose-700" },
};

export function RequestsInbox() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<RequestStatus | "toutes">("en_attente");
  const [accepting, setAccepting] = useState<AppointmentRequest | null>(null);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests", tab],
    queryFn: () => fetchRequests(tab),
    refetchInterval: 30_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["requests"] });
  }

  async function refuse(r: AppointmentRequest) {
    if (!window.confirm(`Refuser la demande de ${r.last_name} ?`)) return;
    setBusyId(r.id);
    try {
      await refuseRequest(r.id);
      toast.success("Demande refusée.");
      invalidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground">
            Demandes de rendez-vous
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground tnum">
            {isLoading ? "Chargement…" : `${requests.length}`}
          </p>
        </div>

        <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "h-9 rounded-md px-3.5 text-sm font-medium transition-colors",
                tab === t.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-4/5" />
            </li>
          ))}
        </ul>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Inbox className="h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            {tab === "en_attente" ? "Aucune demande en attente" : "Aucune demande"}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Les demandes envoyées depuis le site apparaissent ici.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((r, i) => {
            const name = `${r.first_name} ${r.last_name}`.trim() || r.last_name;
            const badge = STATUS_BADGE[r.status];
            const pending = r.status === "en_attente";

            return (
              <li
                key={r.id}
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
                className="flex animate-slide-up flex-col rounded-2xl border bg-card p-5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                      avatarColor(r.id),
                    )}
                  >
                    {initials(r.first_name, r.last_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[
                        r.gender === "M" || r.gender === "F" ? r.gender : "",
                        r.age != null ? `${r.age} ans` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                <dl className="mt-4 flex flex-1 flex-col gap-2 border-t pt-3.5 text-sm text-muted-foreground">
                  <Row icon={Phone}>
                    <a href={`tel:${r.phone}`} className="tnum hover:text-foreground">
                      {r.phone}
                    </a>
                  </Row>

                  {r.preferred_at || r.preferred_period ? (
                    <Row
                      icon={r.preferred_period === "apres_midi" ? Sunset : Sun}
                    >
                      {preferredLabel(r)}
                    </Row>
                  ) : null}

                  <Row icon={r.is_existing_patient ? IdCard : UserPlus}>
                    {r.is_existing_patient ? (
                      <span className="flex flex-wrap items-center gap-x-1.5">
                        Déjà patient
                        {r.numero_dossier ? (
                          <span className="font-medium text-foreground tnum">
                            · N° {r.numero_dossier}
                          </span>
                        ) : null}
                        {/* Verified = the dossier and phone matched a real
                            record, so the identity is not just self-declared. */}
                        {r.dossier_verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            vérifié
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            non vérifié
                          </span>
                        )}
                      </span>
                    ) : (
                      "Nouveau patient"
                    )}
                  </Row>

                  {r.reason ? (
                    <Row icon={StickyNote}>
                      <span className="line-clamp-2">{r.reason}</span>
                    </Row>
                  ) : null}

                  {r.status === "accepte" && r.scheduled_at ? (
                    <Row icon={CalendarClock}>
                      <span className="font-medium text-foreground">
                        {format(new Date(r.scheduled_at), "d MMM yyyy · HH:mm", {
                          locale: fr,
                        })}
                      </span>
                    </Row>
                  ) : null}
                </dl>

                <p className="mt-3 text-xs text-muted-foreground">
                  Reçue{" "}
                  {formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>

                {pending ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={busyId === r.id}
                      onClick={() => refuse(r)}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Refuser
                    </Button>
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        setAccepting(r);
                        setAcceptOpen(true);
                      }}
                    >
                      <Check className="h-4 w-4" /> Accepter
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <AcceptRequestDialog
        request={accepting}
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        onAccepted={invalidate}
      />
    </div>
  );
}

/**
 * What the visitor asked for. A slot picked off the public availability grid
 * carries a real time; a loose "jour souhaité" is stored at midnight, in which
 * case the morning/afternoon preference is the useful part.
 */
function preferredLabel(r: AppointmentRequest): string {
  if (!r.preferred_at) {
    return r.preferred_period === "matin"
      ? "Matin"
      : r.preferred_period === "apres_midi"
        ? "Après-midi"
        : "—";
  }

  const d = new Date(r.preferred_at);
  const exact = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (exact) {
    return format(d, "EEEE d MMMM 'à' HH:mm", { locale: fr });
  }

  const day = format(d, "EEEE d MMMM", { locale: fr });
  const period =
    r.preferred_period === "matin"
      ? "matin"
      : r.preferred_period === "apres_midi"
        ? "après-midi"
        : "";
  return period ? `${day} · ${period}` : day;
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
