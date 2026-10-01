"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, MessageSquareHeart, Search } from "lucide-react";

import { kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

type Hit = { slug: string; name: string; city: string; kind: ProviderKind };

/**
 * "Signaler une erreur" reached from the menu or footer, with no listing
 * attached. Rather than send the visitor away to find the listing and come
 * back, it lets them find it here and carries on to the form.
 */
export function ProviderPicker() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/providers/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        setHits(res.ok ? await res.json() : []);
      } catch {
        /* aborted or offline: keep the last results */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-warm bg-card p-7 shadow-card sm:p-9">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.02em]">Signaler une erreur</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Un horaire faux, un numéro qui ne répond plus, un établissement fermé ? Cherchez la
          fiche concernée, puis dites-nous ce qui ne va pas.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom du médecin, de la pharmacie, du laboratoire…"
          className="h-12 w-full rounded-xl border border-input bg-card pl-10 pr-10 text-[0.95rem] shadow-inner-sm focus-visible:border-primary focus-visible:shadow-glow focus-visible:outline-none"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {q.trim().length >= 2 ? (
        hits.length > 0 ? (
          <ul className="-mt-2 flex flex-col gap-1.5">
            {hits.map((h) => {
              const meta = kindMeta(h.kind);
              return (
                <li key={h.slug}>
                  <button
                    type="button"
                    onClick={() => router.push(`/signaler?etablissement=${encodeURIComponent(h.slug)}`)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border-warm px-3.5 py-3 text-left transition-colors hover:border-primary/30 hover:bg-paper-muted"
                  >
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.chip)}>
                      <meta.Icon className={cn("h-4 w-4", meta.glyph)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{h.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {meta.label}
                        {h.city ? ` · ${h.city}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : !loading ? (
          <p className="-mt-2 text-sm text-muted-foreground">Aucun établissement trouvé pour « {q.trim()} ».</p>
        ) : null
      ) : null}

      <a
        href="/avis"
        className="flex items-center gap-3 rounded-xl bg-paper-muted px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquareHeart className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Le problème concerne le site lui-même, pas une fiche ?{" "}
          <span className="font-semibold text-primary">Donner mon avis</span>
        </span>
      </a>
    </div>
  );
}
