"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import {
  TurnstileGate,
  turnstileMisconfigured,
} from "@/components/public/turnstile-gate";
import { cn } from "@/lib/utils";

/**
 * "Vous avez consulté ici ?"
 *
 * Stars only, by design — there is no free-text field anywhere in this form
 * and none in the table behind it. Nothing publishable is ever written about a
 * named practitioner, so there is no moderation queue and no right of reply to
 * operate.
 *
 * The phone number is not contact information and is never stored by this
 * flow: it is the proof of attendance. The server looks for an accepted
 * appointment at this establishment, for that number, whose slot has already
 * passed, and refuses otherwise.
 */

const DETAIL = [
  { key: "punctuality", label: "Ponctualité" },
  { key: "welcome", label: "Accueil" },
  { key: "explanation", label: "Explications" },
] as const;

type DetailKey = (typeof DETAIL)[number]["key"];

/** A row of five clickable stars. */
function StarInput({
  value,
  onChange,
  label,
  size = "lg",
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  size?: "sm" | "lg";
}) {
  const big = size === "lg";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sur 5`}
          onClick={() => onChange(value === n ? 0 : n)}
          className={cn(
            "rounded-md p-0.5 transition-transform duration-base ease-spring",
            "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          )}
        >
          <Star
            className={cn(
              big ? "h-7 w-7" : "h-[1.15rem] w-[1.15rem]",
              n <= value
                ? "fill-warn-foreground text-warn-foreground"
                : "text-muted-foreground/35",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function RatingForm({
  providerSlug,
  providerName,
}: {
  providerSlug: string;
  providerName: string;
}) {
  const [stars, setStars] = useState(0);
  const [detail, setDetail] = useState<Record<DetailKey, number>>({
    punctuality: 0,
    welcome: 0,
    explanation: 0,
  });
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const blocked = turnstileMisconfigured();

  // Stable identity, or TurnstileGate re-renders its widget on every keystroke.
  const onToken = useCallback((t: string) => setToken(t), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked) return;

    if (stars < 1) {
      toast.error("Choisissez une note de 1 à 5 étoiles.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/public/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_slug: providerSlug,
          phone,
          stars,
          // 0 means "not answered" in the UI and must reach the server as null,
          // never as a score of zero.
          punctuality: detail.punctuality || null,
          welcome: detail.welcome || null,
          explanation: detail.explanation || null,
          turnstile_token: token,
          company: "", // honeypot
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Impossible d'enregistrer votre note.");
        // Single-use token: a refused attempt needs a fresh one.
        setResetSignal((n) => n + 1);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'enregistrer votre note.");
      setResetSignal((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-warm bg-card p-8 text-center shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok-foreground">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="text-base font-bold">Merci pour votre note</h3>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Elle est comptée dans la moyenne de {providerName}. Votre numéro
          n&apos;est pas conservé avec la note.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-2xl border border-border-warm bg-card p-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold tracking-tight">
          Vous avez consulté ici ?
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Notez votre rendez-vous. Seuls les patients dont le rendez-vous a été
          confirmé sur DoctorY et est déjà passé peuvent noter.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Note générale</span>
        <StarInput value={stars} onChange={setStars} label="Note générale" />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold">
          Détail{" "}
          <span className="font-normal text-muted-foreground">
            (facultatif)
          </span>
        </span>
        {DETAIL.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <span className="text-[0.85rem] text-muted-foreground">{label}</span>
            <StarInput
              size="sm"
              label={label}
              value={detail[key]}
              onChange={(n) => setDetail((d) => ({ ...d, [key]: n }))}
            />
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">
          Le numéro utilisé pour le rendez-vous
        </span>
        <input
          type="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="20 123 456"
          className="h-11 rounded-xl border border-input bg-paper px-3.5 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/40"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          Il sert uniquement à vérifier que vous êtes bien venu. Il n&apos;est
          pas enregistré avec votre note et n&apos;est jamais affiché.
        </span>
      </label>

      <TurnstileGate onToken={onToken} resetSignal={resetSignal} />

      <button
        type="submit"
        disabled={busy || blocked || stars < 1}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5",
          "text-sm font-bold text-primary-foreground transition-all duration-base ease-spring",
          "hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Envoyer ma note
      </button>
    </form>
  );
}
