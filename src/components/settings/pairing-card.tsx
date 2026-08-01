"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Link2, Loader2, PlugZap, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Links this practice's website to the doctor's desktop app.
 *
 * The doctor's app generates a key and shows it in its settings; pasting it
 * here is the whole pairing. The app then publishes its own address using that
 * key, so nothing has to be configured per installation and the address may
 * change as often as it likes.
 */
export function PairingCard({
  isLinked,
  apiUrl,
  seenAt,
}: {
  isLinked: boolean;
  apiUrl: string;
  seenAt: string | null;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  // The app re-registers on every start, so a recent timestamp means it is up.
  const seen = seenAt ? new Date(seenAt) : null;
  const online = Boolean(apiUrl) && seen !== null;

  async function link() {
    const value = key.trim();
    if (value.length < 16) {
      toast.error("Cette clé semble incomplète.");
      return;
    }
    setSaving(true);
    const { error } = await createClient().rpc("link_doctor_endpoint", {
      p_key: value,
    });
    setSaving(false);

    if (error) {
      const raised = `${error.message} ${error.details ?? ""}`;
      toast.error(
        raised.includes("KEY_IN_USE")
          ? "Cette clé est déjà utilisée par un autre cabinet."
          : raised.includes("INVALID_KEY")
            ? "Clé invalide."
            : "Impossible d'enregistrer la clé.",
      );
      return;
    }

    setKey("");
    toast.success(
      "Clé enregistrée. L'application du médecin se connectera dans un instant.",
    );
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
            {online
              ? `Connectée — vue il y a ${formatDistanceToNow(seen!, { locale: fr })}`
              : isLinked
                ? "Clé enregistrée, en attente de connexion."
                : "Non liée : l'agenda et les patients ne sont pas accessibles."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="pairing-key" className="text-sm font-medium">
            Clé de liaison
          </Label>
          <Input
            id="pairing-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={isLinked ? "Saisir une nouvelle clé…" : "Collez la clé ici"}
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
          {isLinked ? "Remplacer" : "Lier"}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Le médecin trouve cette clé dans les paramètres de son application. Elle
        ne sert qu&apos;à relier ce site à son ordinateur — elle ne donne accès à
        rien depuis un navigateur.
      </p>

      {isLinked && !online ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          La clé est enregistrée. Si rien ne se connecte, vérifiez que
          l&apos;application du médecin est ouverte sur son ordinateur.
        </p>
      ) : null}
    </section>
  );
}
