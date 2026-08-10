"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminApiError, updateLicense, type LicenseKey } from "@/lib/admin/client-api";

export function EditLicenseDialog({ license }: { license: LicenseKey }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [maxActivations, setMaxActivations] = useState(license.max_activations);
  const [expiresAt, setExpiresAt] = useState(license.expires_at?.slice(0, 10) ?? "");
  const [revoked, setRevoked] = useState(license.revoked);

  const mutation = useMutation({
    mutationFn: () =>
      updateLicense(license.key, {
        max_activations: maxActivations,
        expires_at: expiresAt || null,
        revoked,
      }),
    onSuccess: () => {
      toast.success("Licence mise à jour.");
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Mise à jour impossible.");
    },
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Re-sync in case another tab changed it since the last open.
      setMaxActivations(license.max_activations);
      setExpiresAt(license.expires_at?.slice(0, 10) ?? "");
      setRevoked(license.revoked);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Modifier">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{license.label || license.key}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-max">Machines autorisées</Label>
              <Input
                id="edit-max"
                type="number"
                min={1}
                max={20}
                required
                value={maxActivations}
                onChange={(e) => setMaxActivations(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-expires">Expiration</Label>
              <Input
                id="edit-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/50 px-3.5 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={revoked}
              onChange={(e) => setRevoked(e.target.checked)}
              className="h-4 w-4 accent-destructive"
            />
            Révoquer cette clé (bloque toute machine, même déjà activée)
          </label>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
