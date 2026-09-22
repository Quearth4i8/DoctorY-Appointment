"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  TurnstileGate,
  turnstileMisconfigured,
} from "@/components/public/turnstile-gate";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "horaires", label: "Les horaires sont faux" },
  { value: "adresse", label: "L'adresse est fausse" },
  { value: "telephone", label: "Le numéro ne répond plus" },
  { value: "ferme", label: "L'établissement a fermé" },
  { value: "garde", label: "La garde annoncée est fausse" },
  { value: "autre", label: "Autre chose" },
] as const;

export function ReportForm({
  providerSlug,
  providerName,
}: {
  providerSlug: string;
  providerName: string;
}) {
  const [reason, setReason] = useState<string>("horaires");
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState("");
  const [token, setToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const blocked = turnstileMisconfigured();

  // Stable identity: TurnstileGate renders its widget in an effect keyed on
  // this, so a new function every render would re-render the widget on every
  // keystroke.
  const onToken = useCallback((t: string) => setToken(t), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked) return;

    setBusy(true);
    try {
      const res = await fetch("/api/public/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_slug: providerSlug,
          reason,
          detail,
          contact,
          turnstile_token: token,
          company: "", // honeypot, left empty by humans
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Impossible d'envoyer le signalement.");
        // The token is single-use, so a refused attempt needs a fresh one.
        setResetSignal((n) => n + 1);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'envoyer le signalement.");
      setResetSignal((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-warm bg-card p-9 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-soft text-ok-foreground">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-bold">Merci, c&apos;est noté</h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Nous vérifions et corrigeons la fiche. Si vous avez laissé un contact,
          nous vous préviendrons une fois que c&apos;est fait.
        </p>
        <Link
          href={`/etablissement/${providerSlug}`}
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          Revenir à la fiche
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6 rounded-2xl border border-border-warm bg-card p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Signaler une erreur</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          À propos de <span className="font-semibold text-foreground">{providerName}</span>.
          Aucun compte n&apos;est nécessaire.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Qu&apos;est-ce qui ne va pas ?
        </legend>
        {REASONS.map((r) => (
          <label
            key={r.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
              reason === r.value
                ? "border-primary bg-accent font-semibold text-accent-foreground"
                : "border-border-warm hover:bg-paper-muted",
            )}
          >
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
              className="h-4 w-4"
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="detail" className="text-sm font-semibold">
          Précisions <span className="font-normal text-muted-foreground">— facultatif</span>
        </label>
        <textarea
          id="detail"
          rows={4}
          maxLength={1000}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ex. : fermé le samedi depuis septembre, pas de 15h à 18h."
          className="rounded-xl border border-input bg-card px-3.5 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact" className="text-sm font-semibold">
          Votre téléphone ou e-mail{" "}
          <span className="font-normal text-muted-foreground">— facultatif</span>
        </label>
        <input
          id="contact"
          type="text"
          maxLength={160}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="h-12 rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Uniquement pour vous répondre si nous avons besoin d&apos;une précision.
        </p>
      </div>

      {/* Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <TurnstileGate onToken={onToken} resetSignal={resetSignal} />

      <button
        type="submit"
        disabled={busy || blocked}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[0.95rem] font-bold text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Envoyer le signalement
      </button>
    </form>
  );
}
