"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * `await confirm({...})` — the site's own confirmation dialog, in place of
 * window.confirm(), which the browser draws grey and in its own language
 * ("localhost:3000 says…"), right over a carefully styled screen.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Supprimer ?", destructive: true }))) return;
 *
 * One dialog mounted once by <ConfirmProvider>, so any component can ask
 * without carrying its own open/close state.
 */

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button and warning icon — for anything that deletes or refuses. */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = React.createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  function close(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {pending?.destructive ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <TriangleAlert className="h-[1.1rem] w-[1.1rem]" />
                </span>
              ) : null}
              {pending?.title}
            </DialogTitle>
            {pending?.description ? (
              <DialogDescription className={cn(pending.destructive && "pl-[2.875rem]")}>
                {pending.description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => close(false)}>
              {pending?.cancelLabel ?? "Annuler"}
            </Button>
            <Button
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => close(true)}
              autoFocus
            >
              {pending?.confirmLabel ?? "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = React.useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return confirm;
}
