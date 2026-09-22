"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Back to the top of a long page.
 *
 * Hidden until there is something to scroll back from — a control that does
 * nothing is worse than no control — and it fades rather than popping in, so
 * it does not pull the eye away from what the reader is doing.
 *
 * Deliberately a real <button> with a label: a div with an onClick is
 * unreachable by keyboard, and an icon on its own says nothing to a screen
 * reader.
 */
export function ScrollToTop({ showAfter = 600 }: { showAfter?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    onScroll(); // the page may already be scrolled, e.g. after a #hash jump
    // `passive` because this never calls preventDefault, and a non-passive
    // scroll listener blocks the browser's own scrolling on touch devices.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfter]);

  function toTop() {
    // Honour the OS setting rather than forcing a smooth scroll on someone who
    // asked for less motion — for some people it is the difference between
    // "nice" and "nauseating".
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Revenir en haut de la page"
      title="Revenir en haut"
      // aria-hidden while invisible, so it is not a tab stop that goes nowhere.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full",
        "border border-border-warm bg-card text-foreground shadow-card-hover",
        "transition-all duration-200 hover:bg-paper-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
