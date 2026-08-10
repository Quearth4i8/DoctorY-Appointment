"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Plus } from "lucide-react";
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
import { AdminApiError, createLicense } from "@/lib/admin/client-api";

export function CreateLicenseDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [maxActivations, setMaxActivations] = useState(2);
  const [expiresAt, setExpiresAt] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createLicense({
        label: label.trim(),
        max_activations: maxActivations,
        expires_at: expiresAt || null,
      }),
    onSuccess: (res) => {
      setCreatedKey(res.key);
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Création impossible.");
    },
  });

  function reset() {
    setLabel("");
    setMaxActivations(2);
    setExpiresAt("");
    setCreatedKey(null);
    setCopied(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouvelle clé
        </Button>
      </DialogTrigger>
      <DialogContent>
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Clé créée</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Copiez-la maintenant et transmettez-la au médecin — elle reste
              consultable dans le tableau ensuite.
            </p>
            <button
              type="button"
              onClick={copyKey}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-left font-mono text-sm text-foreground transition-colors hover:border-primary/40"
            >
              {createdKey}
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Terminé</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nouvelle clé de licence</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="label">Libellé (nom du médecin)</Label>
                <Input
                  id="label"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex. Dr Ben Ali"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max">Machines autorisées</Label>
                  <Input
                    id="max"
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={maxActivations}
                    onChange={(e) => setMaxActivations(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expires">Expiration (optionnel)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Créer la clé
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
