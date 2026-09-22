"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";

import { KIND_TABS, kindMeta } from "@/lib/provider-kinds";
import { cn } from "@/lib/utils";
import type { ProviderKind } from "@/types";

/**
 * The annuaire's front door: what, where, and which trade.
 *
 * A plain `<form>` with a real submit, so Enter works from either field and
 * the whole thing degrades to a normal navigation. The kind tabs are a
 * pre-filter rather than a separate search: picking "Pharmacie" narrows the
 * same query instead of sending the visitor somewhere else.
 */
export function SearchBar({
  defaultQuery = "",
  defaultWhere = "",
  defaultKind = null,
  size = "lg",
}: {
  defaultQuery?: string;
  defaultWhere?: string;
  defaultKind?: ProviderKind | null;
  size?: "lg" | "sm";
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ProviderKind | null>(defaultKind);
  const [q, setQ] = useState(defaultQuery);
  const [where, setWhere] = useState(defaultWhere);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (where.trim()) params.set("ou", where.trim());
    if (kind) params.set("kind", kind);
    router.push(`/recherche?${params.toString()}`);
  }

  const tall = size === "lg";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <KindTab active={kind === null} onClick={() => setKind(null)} label="Tout" />
        {KIND_TABS.map((k) => {
          const meta = kindMeta(k);
          return (
            <KindTab
              key={k}
              active={kind === k}
              onClick={() => setKind(k)}
              label={meta.label}
              Icon={meta.Icon}
            />
          );
        })}
      </div>

      <form
        onSubmit={submit}
        className={cn(
          "flex items-center gap-1.5 rounded-2xl border border-border-warm bg-card p-2.5 shadow-card",
          tall ? "max-w-[39rem]" : "max-w-[34rem]",
        )}
      >
        <Field
          id="q-quoi"
          label="Qui ou quoi"
          placeholder="Cardiologue, pharmacie, NFS…"
          value={q}
          onChange={setQ}
          icon={<Search className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />}
          grow="flex-[1.3]"
        />

        <span className="h-9 w-px shrink-0 bg-border-warm" />

        <Field
          id="q-ou"
          label="Où"
          placeholder="Ville ou quartier"
          value={where}
          onChange={setWhere}
          icon={<MapPin className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />}
          grow="flex-1"
        />

        <button
          type="submit"
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-all hover:brightness-110",
            tall ? "h-12 px-6 text-[0.95rem]" : "h-11 px-5 text-sm",
          )}
        >
          <Search className="h-[1.05rem] w-[1.05rem]" />
          <span className="hidden sm:inline">Chercher</span>
        </button>
      </form>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] transition-colors",
        active
          ? "border-foreground bg-foreground font-bold text-background"
          : "border-border-warm bg-card font-semibold text-foreground/75 hover:bg-paper-muted",
      )}
    >
      {Icon ? <Icon className="h-[0.95rem] w-[0.95rem]" /> : null}
      {label}
    </button>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  icon,
  grow,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  grow: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5 px-3", grow)}>
      <span className="shrink-0">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <label
          htmlFor={id}
          className="text-[0.62rem] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 bg-transparent p-0 text-[0.9rem] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
        />
      </span>
    </div>
  );
}
