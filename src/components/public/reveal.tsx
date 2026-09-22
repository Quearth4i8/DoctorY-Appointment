"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals its children when they scroll into view.
 *
 * Two rules it follows that most implementations do not:
 *
 * 1. It starts VISIBLE and is hidden only after mount. Anything that begins at
 *    opacity 0 and waits for a script is a page that renders blank when the
 *    script fails, is still parsing, or is being read by a crawler.
 * 2. It reveals once and then disconnects. Elements that re-hide on scroll-up
 *    are a novelty the first time and an irritation every time after.
 */
export function Reveal({
  children,
  /** Stagger siblings by passing 1, 2, 3… — kept small on purpose. */
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect the OS setting: no hiding, no animation, nothing to reveal.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen at mount (above the fold): show it without the
    // entrance, or the first thing a visitor sees is a flicker.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    setState("hidden");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("shown");
        observer.disconnect();
      },
      // Fires a little before the element's edge arrives, so the movement has
      // finished by the time it is properly in view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      data-reveal={state === "idle" ? undefined : state}
      style={delay ? { transitionDelay: `${Math.min(delay, 4) * 70}ms` } : undefined}
    >
      {children}
    </div>
  );
}
