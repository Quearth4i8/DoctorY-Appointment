"use client";

import * as React from "react";

/**
 * One floating panel at a time, across the whole app.
 *
 * Selects, popovers (date pickers, comboboxes) and dropdown menus each keep
 * their own open state, so opening one never closed another: in the "Nouveau
 * rendez-vous" dialog the hour list and the duration list could hang open
 * side by side. Every root built on this hook announces when it opens, and
 * every other one that is open closes in response.
 *
 * Except its own ancestors: the month list inside a date picker's calendar is
 * a panel within a panel, and closing the calendar because its month list
 * opened would make the list unusable. Each root passes its chain of ids down
 * through context (which follows React's tree, portals included), and a panel
 * never closes for a descendant of its own.
 *
 * Works whether the caller controls `open` or not, and still calls the
 * caller's `onOpenChange` — so a component that tracks its own state (the
 * date picker closing after a pick) is told when it is closed from outside.
 */

const EVENT = "doctory:overlay-open";

type Detail = { id: string; chain: string[] };

const ChainContext = React.createContext<string[]>([]);

export function useExclusiveOpen({
  open,
  defaultOpen,
  onOpenChange,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}): [boolean, (open: boolean) => void, string[]] {
  const id = React.useId();
  const ancestors = React.useContext(ChainContext);
  const chain = React.useMemo(() => [...ancestors, id], [ancestors, id]);

  const [inner, setInner] = React.useState(defaultOpen ?? false);
  const controlled = open !== undefined;
  const value = controlled ? open : inner;

  // Kept in a ref so the listener below never acts on a stale callback.
  const onChangeRef = React.useRef(onOpenChange);
  onChangeRef.current = onOpenChange;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!controlled) setInner(next);
      onChangeRef.current?.(next);
      if (next) {
        window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { id, chain } }));
      }
    },
    [controlled, id, chain],
  );

  React.useEffect(() => {
    if (!value) return;
    const onOther = (e: Event) => {
      const detail = (e as CustomEvent<Detail>).detail;
      // Itself, or a panel opened inside it: stay open.
      if (detail.chain.includes(id)) return;
      setOpen(false);
    };
    window.addEventListener(EVENT, onOther);
    return () => window.removeEventListener(EVENT, onOther);
  }, [value, id, setOpen]);

  return [value, setOpen, chain];
}

/** Wraps a root's children so panels opened inside it know their ancestors. */
export function ExclusiveScope({ chain, children }: { chain: string[]; children: React.ReactNode }) {
  return React.createElement(ChainContext.Provider, { value: chain }, children);
}
