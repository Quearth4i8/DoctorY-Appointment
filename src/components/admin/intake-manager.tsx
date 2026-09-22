"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  FileWarning,
  Inbox,
  Loader2,
  MessageSquare,
  Phone,
  Star,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PROVIDER_KIND_LABELS, type ProviderKind } from "@/types";
import { cn } from "@/lib/utils";

type Queue = "claims" | "reports" | "feedback";

const TABS: { value: Queue; label: string; Icon: typeof Inbox }[] = [
  { value: "claims", label: "Inscriptions", Icon: Building2 },
  { value: "reports", label: "Signalements", Icon: FileWarning },
  { value: "feedback", label: "Avis", Icon: MessageSquare },
];

const REPORT_REASONS: Record<string, string> = {
  horaires: "Horaires faux",
  adresse: "Adresse fausse",
  telephone: "Téléphone injoignable",
  ferme: "Établissement fermé",
  garde: "Garde fausse",
  autre: "Autre",
};

const FEEDBACK_CATEGORIES: Record<string, string> = {
  suggestion: "Idée",
  probleme: "Problème",
  compliment: "Compliment",
  autre: "Autre",
};

async function get(queue: Queue | null, status: string) {
  const qs = new URLSearchParams();
  if (queue) qs.set("queue", queue);
  if (status) qs.set("status", status);
  const res = await fetch(`/api/admin/intake?${qs.toString()}`);
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Chargement impossible.");
  }
  return res.json();
}

function ago(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}

export function IntakeManager() {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<Queue>("claims");
  const [status, setStatus] = useState("nouveau");

  const counts = useQuery({
    queryKey: ["intake-counts"],
    queryFn: () => get(null, ""),
    refetchInterval: 60_000,
  });

  const rows = useQuery({
    queryKey: ["intake", queue, status],
    queryFn: () => get(queue, status),
  });

  const act = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        provider_slug?: string;
        created?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "Action impossible.");
      return data;
    },
    onSuccess: (data) => {
      // Both lists move when a row is resolved, and so does the badge.
      qc.invalidateQueries({ queryKey: ["intake"] });
      qc.invalidateQueries({ queryKey: ["intake-counts"] });
      if (data.created && data.provider_slug) {
        toast.success("Fiche créée en brouillon.", {
          description: `Slug : ${data.provider_slug} — à compléter avant publication.`,
        });
      } else {
        toast.success("C'est fait.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = counts.data as
    | { claims?: number; reports?: number; feedback?: number }
    | undefined;
  const badge: Record<Queue, number> = {
    claims: c?.claims ?? 0,
    reports: c?.reports ?? 0,
    feedback: c?.feedback ?? 0,
  };

  const list = Array.isArray(rows.data) ? rows.data : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Demandes reçues</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Inscriptions d&apos;établissements, signalements de fiches et avis
            sur le site.
          </p>
        </div>

        <div className="flex items-center rounded-[0.625rem] bg-muted p-0.5">
          {["nouveau", "toutes"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "h-9 rounded-md px-3.5 text-sm transition-colors",
                status === s
                  ? "bg-card font-bold text-foreground shadow-card"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "nouveau" ? "À traiter" : "Tout"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setQueue(value)}
            aria-pressed={queue === value}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition-colors",
              queue === value
                ? "border-clay bg-clay font-bold text-white"
                : "border-border bg-card font-semibold text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge[value] > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[0.65rem] font-bold tnum",
                  queue === value ? "bg-white/20" : "bg-warn-soft text-warn-foreground",
                )}
              >
                {badge[value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {rows.isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : rows.isError ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft p-5 text-sm text-danger-foreground">
          {(rows.error as Error).message}
        </p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <Inbox className="h-7 w-7 text-muted-foreground" />
          <p className="font-bold">Rien à traiter</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Les nouvelles demandes arrivent ici et la pastille s&apos;allume.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue === "claims"
            ? list.map((r: Record<string, string | null>) => (
                <ClaimRow
                  key={r.id as string}
                  row={r}
                  busy={act.isPending}
                  onApprove={() => act.mutate({ id: r.id, action: "approve" })}
                  onRefuse={() =>
                    act.mutate({ id: r.id, status: "refuse" })
                  }
                />
              ))
            : queue === "reports"
              ? list.map((r: Record<string, string | null>) => (
                  <ReportRow
                    key={r.id as string}
                    row={r}
                    busy={act.isPending}
                    onDone={(s) => act.mutate({ id: r.id, status: s })}
                  />
                ))
              : list.map((r: Record<string, string | number | null>) => (
                  <FeedbackRow
                    key={r.id as string}
                    row={r}
                    busy={act.isPending}
                    onDone={(s) => act.mutate({ id: r.id, status: s })}
                  />
                ))}
        </ul>
      )}
    </div>
  );
}

function Shell({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "new";
}) {
  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-5 shadow-card",
        tone === "new" ? "border-warn/30" : "border-border",
      )}
    >
      {children}
    </li>
  );
}

function ClaimRow({
  row,
  busy,
  onApprove,
  onRefuse,
}: {
  row: Record<string, string | null>;
  busy: boolean;
  onApprove: () => void;
  onRefuse: () => void;
}) {
  const isNew = row.status === "nouveau";
  const claiming = row.intent === "revendication";
  const kindLabel = row.kind
    ? (PROVIDER_KIND_LABELS[row.kind as ProviderKind] ?? row.kind)
    : null;

  return (
    <Shell tone={isNew ? "new" : "default"}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.95rem] font-bold">
              {row.establishment || row.provider_name || row.contact_name}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold",
                claiming
                  ? "bg-info-soft text-info-foreground"
                  : "bg-primary-soft text-primary-soft-foreground",
              )}
            >
              {claiming ? "Revendication" : "Inscription"}
            </span>
            {kindLabel ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                {kindLabel}
              </span>
            ) : null}
            <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
              {ago(row.created_at as string)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.82rem] text-muted-foreground">
            <span className="font-semibold text-foreground">{row.contact_name}</span>
            <a
              href={`tel:${(row.phone ?? "").replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 font-mono hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {row.phone}
            </a>
            {row.email ? <span className="truncate">{row.email}</span> : null}
            {row.city ? <span>{row.city}</span> : null}
            {row.professional_id ? (
              <span className="font-mono">n° {row.professional_id}</span>
            ) : null}
          </div>

          {row.message ? (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-foreground/80">
              {row.message}
            </p>
          ) : null}

          {row.provider_slug ? (
            <Link
              href={`/etablissement/${row.provider_slug}`}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-primary hover:underline"
            >
              Voir la fiche
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {isNew ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="inline-flex h-10 items-center gap-2 rounded-[0.625rem] bg-primary px-4 text-[0.82rem] font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              <BadgeCheck className="h-4 w-4" />
              {claiming ? "Accepter" : "Créer la fiche"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRefuse}
              className="inline-flex h-10 items-center gap-2 rounded-[0.625rem] border border-danger/25 bg-danger-soft px-4 text-[0.82rem] font-bold text-danger-foreground transition-colors disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Refuser
            </button>
          </div>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold",
              row.status === "accepte"
                ? "bg-ok-soft text-ok-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {row.status === "accepte" ? "Acceptée" : "Refusée"}
          </span>
        )}
      </div>
    </Shell>
  );
}

function ReportRow({
  row,
  busy,
  onDone,
}: {
  row: Record<string, string | null>;
  busy: boolean;
  onDone: (status: string) => void;
}) {
  const isNew = row.status === "nouveau";
  return (
    <Shell tone={isNew ? "new" : "default"}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[0.65rem] font-extrabold text-warn-foreground">
              {REPORT_REASONS[row.reason as string] ?? row.reason}
            </span>
            <span className="text-[0.95rem] font-bold">
              {row.provider_name ?? "Fiche supprimée"}
            </span>
            <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
              {ago(row.created_at as string)}
            </span>
          </div>
          {row.detail ? (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-foreground/80">
              {row.detail}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[0.8rem]">
            {row.contact ? (
              <span className="font-mono text-muted-foreground">{row.contact}</span>
            ) : null}
            {row.provider_slug ? (
              <Link
                href={`/etablissement/${row.provider_slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
              >
                Voir la fiche
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        {isNew ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDone("traite")}
              className="inline-flex h-10 items-center gap-2 rounded-[0.625rem] bg-primary px-4 text-[0.82rem] font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Corrigé
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDone("rejete")}
              className="inline-flex h-10 items-center rounded-[0.625rem] border border-border px-4 text-[0.82rem] font-bold text-muted-foreground transition-colors disabled:opacity-60"
            >
              Ignorer
            </button>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground">
            {row.status === "traite" ? "Corrigé" : "Ignoré"}
          </span>
        )}
      </div>
    </Shell>
  );
}

function FeedbackRow({
  row,
  busy,
  onDone,
}: {
  row: Record<string, string | number | null>;
  busy: boolean;
  onDone: (status: string) => void;
}) {
  const isNew = row.status === "nouveau";
  const rating = typeof row.rating === "number" ? row.rating : null;

  return (
    <Shell tone={isNew ? "new" : "default"}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {rating ? (
              <span className="inline-flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= rating ? "fill-warn text-warn" : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </span>
            ) : (
              <span className="text-[0.7rem] font-semibold text-muted-foreground">
                sans note
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
              {FEEDBACK_CATEGORIES[row.category as string] ?? row.category}
            </span>
            {row.page_path ? (
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                {row.page_path}
              </span>
            ) : null}
            <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground">
              {ago(row.created_at as string)}
            </span>
          </div>

          <p className="mt-2 whitespace-pre-line text-[0.88rem] leading-relaxed text-foreground/85">
            {row.message}
          </p>

          {row.contact ? (
            <p className="mt-2 font-mono text-[0.8rem] text-muted-foreground">
              {row.contact}
            </p>
          ) : null}
        </div>

        {isNew ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDone("lu")}
              className="inline-flex h-10 items-center gap-2 rounded-[0.625rem] bg-primary px-4 text-[0.82rem] font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Lu
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDone("rejete")}
              className="inline-flex h-10 items-center rounded-[0.625rem] border border-border px-4 text-[0.82rem] font-bold text-muted-foreground transition-colors disabled:opacity-60"
            >
              Ignorer
            </button>
          </div>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.7rem] font-bold text-muted-foreground">
            {row.status === "lu" ? "Lu" : row.status === "traite" ? "Traité" : "Ignoré"}
          </span>
        )}
      </div>
    </Shell>
  );
}
