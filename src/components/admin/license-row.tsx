"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Ban, ChevronDown, ChevronRight, Loader2, Monitor, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  AdminApiError,
  deleteLicense,
  fetchActivations,
  releaseActivation,
  updateLicense,
  type LicenseKey,
} from "@/lib/admin/client-api";
import { cn } from "@/lib/utils";
import { EditLicenseDialog } from "./edit-license-dialog";

function statusBadge(license: LicenseKey) {
  if (license.revoked) {
    return <Badge variant="destructive">Révoquée</Badge>;
  }
  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return (
      <Badge variant="outline" className="border-warn/40 text-warn-foreground dark:text-warn">
        Expirée
      </Badge>
    );
  }
  if (license.activation_count >= license.max_activations) {
    return (
      <Badge variant="outline" className="border-primary/40 text-primary">
        Complète
      </Badge>
    );
  }
  return <Badge variant="secondary">Active</Badge>;
}

export function LicenseRow({ license }: { license: LicenseKey }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);

  const { data: activations, isLoading } = useQuery({
    queryKey: ["admin-activations", license.key],
    queryFn: () => fetchActivations(license.key),
    enabled: expanded,
  });

  const release = useMutation({
    mutationFn: (id: string) => releaseActivation(license.key, id),
    onSuccess: () => {
      toast.success("Machine libérée.");
      qc.invalidateQueries({ queryKey: ["admin-activations", license.key] });
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
    },
    onError: (err) =>
      toast.error(err instanceof AdminApiError ? err.message : "Action impossible."),
  });

  const remove = useMutation({
    mutationFn: () => deleteLicense(license.key),
    onSuccess: () => {
      toast.success("Clé supprimée.");
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
    },
    onError: (err) =>
      toast.error(err instanceof AdminApiError ? err.message : "Suppression impossible."),
  });

  const toggleRevoked = useMutation({
    mutationFn: () =>
      updateLicense(license.key, {
        max_activations: license.max_activations,
        expires_at: license.expires_at,
        revoked: !license.revoked,
      }),
    onSuccess: () => {
      toast.success(license.revoked ? "Clé réactivée." : "Clé révoquée.");
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
    },
    onError: (err) =>
      toast.error(err instanceof AdminApiError ? err.message : "Action impossible."),
  });

  const usageRatio = Math.min(1, license.activation_count / license.max_activations);
  const atLimit = license.activation_count >= license.max_activations;

  return (
    <>
      <tr className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
        <td className="py-3 pl-2 pr-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label={expanded ? "Réduire" : "Voir les machines"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="py-3 pr-4">
          <p className="font-medium text-foreground">{license.label || "—"}</p>
          <p className="font-mono text-xs text-muted-foreground">{license.key}</p>
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  atLimit ? "bg-primary" : "bg-primary/70",
                )}
                style={{ width: `${usageRatio * 100}%` }}
              />
            </div>
            <span className="tnum text-sm text-muted-foreground">
              {license.activation_count}/{license.max_activations}
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 text-sm text-muted-foreground">
          {license.expires_at
            ? new Date(license.expires_at).toLocaleDateString("fr-FR")
            : "Sans expiration"}
        </td>
        <td className="py-3 pr-4">{statusBadge(license)}</td>
        <td className="py-3 pr-2">
          <div className="flex items-center justify-end gap-1">
            <EditLicenseDialog license={license} />
            <Button
              variant="ghost"
              size="icon"
              title={license.revoked ? "Réactiver" : "Révoquer"}
              disabled={toggleRevoked.isPending}
              onClick={async () => {
                if (
                  license.revoked ||
                  (await confirm({
                    title: "Révoquer cette clé ?",
                    description: `Révoquer la clé de ${license.label || license.key} ? Toutes ses machines seront bloquées dès leur prochaine connexion. Vous pourrez la réactiver.`,
                    confirmLabel: "Révoquer",
                    destructive: true,
                  }))
                ) {
                  toggleRevoked.mutate();
                }
              }}
            >
              {toggleRevoked.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : license.revoked ? (
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Ban className="h-4 w-4 text-destructive" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Supprimer"
              disabled={remove.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: "Supprimer cette clé ?",
                  description: `Supprimer la clé de ${license.label || license.key} ? Toutes ses machines perdront l'accès dès leur prochaine connexion. Cette action est irréversible.`,
                  confirmLabel: "Supprimer",
                  destructive: true,
                });
                if (ok) remove.mutate();
              }}
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-b border-border/60 bg-secondary/20">
          <td colSpan={6} className="px-4 py-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : !activations?.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune machine activée pour l&apos;instant.
              </p>
            ) : (
              <ul className="space-y-2">
                {activations.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.hostname || "Ordinateur sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Activée{" "}
                          {formatDistanceToNow(new Date(a.activated_at), {
                            addSuffix: true,
                            locale: fr,
                          })}{" "}
                          · vue{" "}
                          {formatDistanceToNow(new Date(a.last_seen_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={release.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Libérer cette machine ?",
                          description: "Libérer cette machine ? Le médecin pourra activer un nouvel ordinateur à sa place. Attention : cela ne bloque pas cette machine — si elle se reconnecte, elle reprendra la place libre. Pour bloquer, révoquez la clé.",
                          confirmLabel: "Libérer",
                        });
                        if (ok) release.mutate(a.id);
                      }}
                    >
                      Libérer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
