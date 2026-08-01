"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Link2, Loader2, PlugZap, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Hint = {
  has_key: boolean;
  last4: string;
  seen_at: string | null;
  api_linked: boolean;
};

/**
 * Links this account to a doctor, using the key his app generates.
 *
 * Pasting a key that already belongs to a practice MOVES this account to it —
 * agenda, patients and demandes all change together, and the previous practice
 * is left untouched. Pasting a key nobody holds registers it for the practice
 * this account already works for, which is what a reinstall looks like.
 *
 * The stored key is shown as a fingerprint only — dots plus its last four
 * characters. The full value is never sent to the browser: it opens the
 * doctor's API directly, which would let a secretary read the clinical record
 * the proxy deliberately keeps from her.
 */
export function PairingCard() {
  const router = useRouter();
  const [hint, setHint] = useState<Hint | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().rpc("doctor_key_hint");
    const row = Array.isArray(data) ? data[0] : data;
    setHint((row as Hint) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const online = Boolean(hint?.api_linked && hint?.seen_at);
  const seen = hint?.seen_at ? new Date(hint.seen_at) : null;

  async function link() {
    const value = key.trim();
    if (value.length < 16) {
      toast.error("Cette clé semble incomplète.");
      return;
    }
    setSaving(true);
    const { data, error } = await createClient().rpc("link_doctor_endpoint", {
      p_key: value,
    });
    setSaving(false);

    if (error) {
      const raised = `${error.message} ${error.details ?? ""}`;
      toast.error(
        raised.includes("INVALID_KEY")
          ? "Clé invalide."
          : "Impossible d'enregistrer la clé.",
      );
      return;
    }

    setKey("");
    setRevealed(false);
    await load();
    // 'rebound' means the key belonged to another practice and this account has
    // moved to it — agenda, patients and demandes all change with it.
    if (data === "rebound") {
      // Every cached page belongs to the previous practice — agenda, patients,
      // demandes. Reload rather than refresh: nothing from before should
      // survive a change of cabinet.
      toast.success("Compte rattaché à ce cabinet.");
      window.location.reload();
      return;
    }
    toast.success("Clé enregistrée. L'application du médecin va se connecter.");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            online
              ? "bg-emerald-100 text-emerald-700"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {online ? (
            <PlugZap className="h-[1.05rem] w-[1.05rem]" />
          ) : (
            <Unplug className="h-[1.05rem] w-[1.05rem]" />
          )}
        </span>
        <div>
          <h2 className="text-[0.95rem] font-semibold text-foreground">
            Application du médecin
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading
              ? "Vérification…"
              : online
                ? `Connectée — vue il y a ${formatDistanceToNow(seen!, { locale: fr })}`
                : hint?.has_key
                  ? "Clé enregistrée, en attente de connexion."
                  : "Non liée : l'agenda et les patients ne sont pas accessibles."}
          </p>
        </div>
      </div>

      {/* Current key, as a fingerprint. */}
      {hint?.has_key ? (
        <div className="mb-4">
          <Label className="text-sm font-medium">Clé enregistrée</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-secondary/50 px-3.5 py-2.5 font-mono text-sm tracking-widest text-foreground">
              {revealed ? `${"•".repeat(20)}${hint.last4}` : "•".repeat(24)}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setRevealed((v) => !v)}
              title={revealed ? "Masquer" : "Afficher les 4 derniers caractères"}
              aria-label={revealed ? "Masquer" : "Afficher"}
            >
              {revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {revealed
              ? "Seuls les 4 derniers caractères sont affichés — de quoi vérifier la clé auprès du médecin, sans pouvoir la réutiliser ailleurs."
              : "Une clé est enregistrée pour ce cabinet."}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="pairing-key" className="text-sm font-medium">
            {hint?.has_key ? "Remplacer par une nouvelle clé" : "Clé de liaison"}
          </Label>
          <Input
            id="pairing-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Collez la clé du médecin"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>
        <Button onClick={link} disabled={saving || !key.trim()} className="sm:w-40">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {hint?.has_key ? "Remplacer" : "Lier"}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {hint?.has_key
          ? "Saisir la clé d'un autre médecin rattache ce compte à son cabinet : vous verrez son agenda, ses patients et ses demandes à la place des actuels."
          : "Le médecin trouve cette clé dans son application, section « Site de rendez-vous »."}
      </p>
    </section>
  );
}
