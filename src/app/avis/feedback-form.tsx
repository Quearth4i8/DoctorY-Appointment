"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  CheckCircle2,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  Star,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  TurnstileGate,
  turnstileMisconfigured,
} from "@/components/public/turnstile-gate";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "suggestion", label: "Une idée", Icon: Lightbulb },
  { value: "probleme", label: "Un problème", Icon: TriangleAlert },
  { value: "compliment", label: "Un compliment", Icon: Heart },
  { value: "autre", label: "Autre chose", Icon: MessageSquare },
] as const;

/** What each score means, so a 3 is not left to interpretation. */
const RATING_LABELS = [
  "",
  "Franchement pénible",
  "Peut mieux faire",
  "Correct",
  "Bien",
  "Excellent",
];

const PLACEHOLDERS: Record<string, string> = {
  suggestion:
    "Ex. : j'aimerais filtrer par médecin qui parle arabe, ou voir les tarifs avant d'ouvrir la fiche.",
  probleme:
    "Ex. : le calendrier ne s'affiche pas sur mon téléphone, la recherche ne trouve pas ma ville…",
  compliment: "Ce qui vous a été utile — ça aide à savoir quoi garder.",
  autre: "Dites-nous.",
};

export function FeedbackForm() {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [category, setCategory] = useState<string>("suggestion");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");

  const [token, setToken] = useState("");
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const blocked = turnstileMisconfigured();
  const onToken = useCallback((t: string) => setToken(t), []);

  // What the label reads while pointing at a star you have not committed to.
  const shown = hovered ?? rating;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || blocked) return;

    setBusy(true);
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          category,
          message,
          contact,
          // Where they were when they had the thought. The server strips
          // anything after the path.
          page_path:
            typeof window === "undefined" ? "" : window.location.pathname,
          turnstile_token: token,
          company: "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Impossible d'envoyer votre avis.");
        setResetSignal((n) => n + 1);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'envoyer votre avis.");
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
        <h2 className="text-lg font-bold">Merci, c&apos;est lu</h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Chaque message est lu par quelqu&apos;un, pas trié par un robot. Si
          vous avez laissé un contact et que votre remarque appelle une réponse,
          vous en aurez une.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all duration-base ease-spring hover:brightness-110"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-7 rounded-2xl border border-border-warm bg-card p-6 shadow-card sm:p-8"
    >
      {/*
        A real radio group, not clickable spans. Stars drawn as divs are
        invisible to a keyboard and silent to a screen reader — and a rating
        control is exactly the kind of thing people tab into.
      */}
      <fieldset
        className="flex flex-col gap-3"
        onMouseLeave={() => setHovered(null)}
      >
        <legend className="text-sm font-bold">
          Comment trouvez-vous le site ?{" "}
          <span className="font-normal text-muted-foreground">— facultatif</span>
        </legend>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = (shown ?? 0) >= n;
            return (
              <label
                key={n}
                onMouseEnter={() => setHovered(n)}
                className="cursor-pointer p-1"
                title={RATING_LABELS[n]}
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only peer"
                />
                <span className="sr-only">
                  {n} sur 5 — {RATING_LABELS[n]}
                </span>
                <Star
                  aria-hidden
                  className={cn(
                    "h-8 w-8 transition-all duration-base ease-spring peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:rounded",
                    on
                      ? "scale-105 fill-warn text-warn"
                      : "text-muted-foreground/35",
                  )}
                />
              </label>
            );
          })}

          <span
            aria-hidden
            className="ml-2 text-sm font-semibold text-muted-foreground"
          >
            {shown ? RATING_LABELS[shown] : ""}
          </span>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-bold">De quoi s&apos;agit-il ?</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label, Icon }) => {
            const on = category === value;
            return (
              <label
                key={value}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-base",
                  on
                    ? "border-primary bg-accent font-bold text-accent-foreground"
                    : "border-border-warm font-semibold text-foreground/75 hover:bg-paper-muted",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={on}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-message" className="text-sm font-bold">
          Votre message
        </label>
        <textarea
          id="fb-message"
          required
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={PLACEHOLDERS[category]}
          className="rounded-xl border border-input bg-card px-3.5 py-3 text-sm leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
        <p className="self-end font-mono text-[0.7rem] text-muted-foreground tnum">
          {message.length} / 2000
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-contact" className="text-sm font-bold">
          Votre email ou téléphone{" "}
          <span className="font-normal text-muted-foreground">— facultatif</span>
        </label>
        <input
          id="fb-contact"
          type="text"
          maxLength={160}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="h-12 rounded-xl border border-input bg-card px-3.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Uniquement pour vous répondre. Votre avis reste privé — il
          n&apos;est jamais publié sur le site.
        </p>
      </div>

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
        disabled={busy || blocked || message.trim().length < 3}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[0.95rem] font-bold text-primary-foreground transition-all duration-base ease-spring hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Envoyer mon avis
      </button>
    </form>
  );
}
