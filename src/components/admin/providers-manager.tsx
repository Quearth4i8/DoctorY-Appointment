"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, Building2, Loader2, Search } from "lucide-react";

import { PROVIDER_KIND_LABELS, type ProviderKind } from "@/types";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  kind: string;
  slug: string;
  name: string;
  city: string;
  phone: string;
  is_published: boolean;
  hours_count: number;
  duty_count: number;
};

export function ProvidersManager() {
  const [q, setQ] = useState("");
  const [draftsOnly, setDraftsOnly] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-providers", q, draftsOnly],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (draftsOnly) p.set("drafts", "1");
      const res = await fetch(`/api/admin/providers?${p.toString()}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Chargement impossible.");
      }
      return (await res.json()) as Row[];
    },
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Établissements</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Complétez une fiche, puis publiez-la pour qu&apos;elle apparaisse
            dans l&apos;annuaire.
          </p>
        </div>

        <div className="flex items-center rounded-[0.625rem] bg-muted p-0.5">
          {[
            { on: false, label: "Toutes" },
            { on: true, label: "Brouillons" },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setDraftsOnly(t.on)}
              className={cn(
                "h-9 rounded-md px-3.5 text-sm transition-colors",
                draftsOnly === t.on
                  ? "bg-card font-bold text-foreground shadow-card"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, ville ou slug…"
          className="h-11 w-full rounded-[0.625rem] border border-input bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : isError ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft p-5 text-sm text-danger-foreground">
          {(error as Error).message}
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <Building2 className="h-7 w-7 text-muted-foreground" />
          <p className="font-bold">Aucun établissement</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Les fiches créées depuis une demande acceptée apparaissent ici.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            // What still blocks publication, said before they click into it.
            const missing = r.hours_count === 0;
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/etablissements/${r.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-secondary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.95rem] font-bold">{r.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-bold text-muted-foreground">
                        {PROVIDER_KIND_LABELS[r.kind as ProviderKind] ?? r.kind}
                      </span>
                      {!r.is_published && missing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[0.65rem] font-bold text-warn-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          horaires manquants
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">/{r.slug}</span>
                      {r.city ? <span>{r.city}</span> : null}
                      {r.phone ? <span className="font-mono">{r.phone}</span> : null}
                      {r.duty_count > 0 ? (
                        <span>
                          {r.duty_count} garde{r.duty_count > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-bold",
                      r.is_published
                        ? "bg-ok-soft text-ok-foreground"
                        : "bg-warn-soft text-warn-foreground",
                    )}
                  >
                    {r.is_published ? "Publiée" : "Brouillon"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
