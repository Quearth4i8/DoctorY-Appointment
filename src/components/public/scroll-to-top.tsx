"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronsUp } from "lucide-react";

import { cn } from "@/lib/utils";

/** The top half of a hexagon, softened: slanted sides with rounded shoulders
 *  and feet that flare into the edge, so it reads as a tab growing out of the
 *  bottom of the window rather than a floating button. Same shape as the
 *  desktop app's (doctor_desktop_app_v2 · ScrollToTop.tsx), drawn at 1.18×
 *  so it stays an easy target for a finger. The outline is open at the
 *  bottom — it sits on the edge. */
const VIEW_W = 88;
const VIEW_H = 22;
const SCALE = 1.18;
const TAB_OUTLINE =
  "M0 22 C6 22 9 20 11.5 16 L17 6 C18.6 3 20.6 1 24.5 1 L63.5 1 C67.4 1 69.4 3 71 6 L76.5 16 C79 20 82 22 88 22";

/**
 * Back to the top of a long page.
 *
 * Hidden until there is something to scroll back from — a control that does
 * nothing is worse than no control — and it slides up out of the bottom edge
 * rather than popping in, so it does not pull the eye away from what the
 * reader is doing.
 *
 * Deliberately a real <button> with a label: a div with an onClick is
 * unreachable by keyboard, and an icon on its own says nothing to a screen
 * reader.
 */
export function ScrollToTop({
  showAfter = 600,
  centerOn,
}: {
  showAfter?: number;
  /** In a layout with a sidebar (secretary, admin): the content column to
   *  centre under, rather than the whole window. The tab stays `fixed` — kept
   *  out of the page's flow, so it can never make the page taller than its
   *  frame (an in-flow strip did, leaving a band below the sidebar). */
  centerOn?: RefObject<HTMLElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  // What is being scrolled: usually the page, but some screens scroll a box of
  // their own (the agenda's grid) — the tab must follow whichever it is.
  const scroller = useRef<HTMLElement | Window | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t === document || t === window) {
        scroller.current = window;
        setVisible(window.scrollY > showAfter);
        return;
      }
      // A big content area, not a dropdown list or a pop-up window's body.
      if (t instanceof HTMLElement && t.clientHeight > 300 && !t.closest('[role="dialog"]')) {
        scroller.current = t;
        setVisible(t.scrollTop > showAfter);
      }
    };
    onScroll({ target: document } as unknown as Event); // e.g. after a #hash jump
    // Capture, because scroll events from an inner box do not bubble up.
    // `passive` because this never calls preventDefault, and a non-passive
    // scroll listener blocks the browser's own scrolling on touch devices.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [showAfter]);

  // Follows the column when the sidebar collapses or the window resizes.
  useEffect(() => {
    const el = centerOn?.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setLeft(r.left + r.width / 2);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [centerOn]);


  function toTop() {
    // Honour the OS setting rather than forcing a smooth scroll on someone who
    // asked for less motion — for some people it is the difference between
    // "nice" and "nauseating".
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (scroller.current ?? window).scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  const width = Math.round(VIEW_W * SCALE);
  const height = Math.round(VIEW_H * SCALE);

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
        "group fixed bottom-0 z-50 -translate-x-1/2 outline-none",
        left === null && "left-1/2",
        "transition-transform duration-300 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      style={{ width, height, ...(left !== null ? { left } : {}) }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="absolute inset-0 overflow-visible drop-shadow-[0_-2px_6px_rgba(0,0,0,0.06)]"
        aria-hidden
      >
        <path
          d={`${TAB_OUTLINE} Z`}
          className="fill-card transition-colors duration-200 group-hover:fill-[hsl(var(--primary)/0.06)]"
        />
        <path
          d={TAB_OUTLINE}
          fill="none"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="stroke-border-warm transition-colors duration-200 group-hover:stroke-primary/50 group-focus-visible:stroke-primary group-focus-visible:[stroke-width:2]"
        />
      </svg>
      <ChevronsUp
        className={cn(
          "relative mx-auto mt-[4px] h-[18px] w-[18px] text-muted-foreground transition-all duration-200",
          "group-hover:-translate-y-px group-hover:text-primary group-focus-visible:text-primary",
        )}
      />
    </button>
  );
}

