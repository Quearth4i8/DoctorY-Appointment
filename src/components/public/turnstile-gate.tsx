"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { turnstileEnabled } from "@/lib/turnstile-enabled";

// `window.turnstile` is declared globally in src/app/demande/request-form.tsx.
// Redeclaring it here is a TS2717 conflict — two `declare global` blocks for
// one property must match exactly — so this file just uses it.

/**
 * The Cloudflare bot gate, as a component every public form can mount.
 *
 * It exists because the verification fails CLOSED: with the gate switched on,
 * a form that posts no token is rejected outright. So any form reachable
 * without a session has to render this, or it works perfectly in development
 * and silently refuses every submission in production.
 */

/** True when the gate is on but the site key is missing — a deployment fault. */
export function turnstileMisconfigured(): boolean {
  return turnstileEnabled() && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

export function TurnstileGate({
  onToken,
  /** Bump to force a fresh token: a Turnstile token is single-use, so a
   *  rejected submission needs a new one before the visitor can retry. */
  resetSignal = 0,
}: {
  onToken: (token: string) => void;
  resetSignal?: number;
}) {
  const enabled = turnstileEnabled();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  const [scriptReady, setScriptReady] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const firstReset = useRef(resetSignal);

  useEffect(() => {
    if (!scriptReady || !holder.current || widgetId.current || !siteKey) return;
    try {
      widgetId.current =
        window.turnstile?.render(holder.current, {
          sitekey: siteKey,
          callback: onToken,
        }) ?? null;
    } catch {
      // A duplicate render (React 18 mounts effects twice in development) is
      // not worth surfacing; the first widget is already live.
    }
  }, [scriptReady, siteKey, onToken]);

  useEffect(() => {
    if (resetSignal === firstReset.current || !widgetId.current) return;
    onToken("");
    window.turnstile?.reset(widgetId.current);
  }, [resetSignal, onToken]);

  if (!enabled) return null;

  if (!siteKey) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-warn-soft px-3.5 py-3 text-xs leading-relaxed text-warn-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        La vérification anti-robot est activée mais mal configurée. Ce
        formulaire est temporairement indisponible.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={holder} />
    </>
  );
}
