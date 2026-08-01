"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { avatarColor, initials } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import type { Staff } from "@/lib/supabase/server";

export function ProfileForm({ staff }: { staff: Staff }) {
  const router = useRouter();

  const [name, setName] = useState(staff.full_name);
  const [email, setEmail] = useState(staff.email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = name.trim() || "Compte";
  const [first = "", ...rest] = displayName.split(" ");

  async function saveName() {
    const value = name.trim();
    if (!value) {
      toast.error("Le nom ne peut pas être vide.");
      return;
    }
    setSavingName(true);
    const supabase = createClient();
    // RLS lets a staff member update only full_name, only on their own row.
    const { error } = await supabase
      .from("staff")
      .update({ full_name: value })
      .eq("user_id", staff.user_id);
    setSavingName(false);

    if (error) {
      toast.error("Impossible d'enregistrer le nom.");
      return;
    }
    toast.success("Nom mis à jour.");
    router.refresh();
  }

  async function saveEmail() {
    const value = email.trim();
    if (!value) {
      toast.error("L'email ne peut pas être vide.");
      return;
    }
    setSavingEmail(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ email: value });
    setSavingEmail(false);

    if (error) {
      toast.error(
        error.message.includes("already")
          ? "Cette adresse est déjà utilisée."
          : "Impossible de changer l'email.",
      );
      return;
    }

    // With email confirmation enabled, the change only lands once the link in
    // the message sent to the NEW address is clicked.
    if (data.user?.new_email) {
      toast.success(
        `Un email de confirmation a été envoyé à ${data.user.new_email}. L'adresse changera après validation.`,
        { duration: 8000 },
      );
    } else {
      toast.success("Email mis à jour.");
      router.refresh();
    }
  }

  async function savePassword() {
    if (password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);

    if (error) {
      toast.error("Impossible de changer le mot de passe.");
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Mot de passe mis à jour.");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Identity banner — sign-out lives here rather than in a card of its
          own, which left an orphan tile on a row by itself. */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card bg-mesh px-6 py-5 shadow-card">
        <span
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold",
            avatarColor(staff.user_id),
          )}
        >
          {initials(first, rest.join(" ") || first)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight text-foreground">
            {displayName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{staff.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </form>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card
          icon={UserRound}
          title="Nom"
          description="Le nom affiché dans l'application."
          action={
            <Button
              onClick={saveName}
              disabled={savingName || name.trim() === staff.full_name}
              className="w-full"
            >
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Nom complet
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom et prénom"
            />
          </div>
        </Card>

        <Card
          icon={Mail}
          title="Email"
          description="L'adresse utilisée pour se connecter."
          action={
            <Button
              onClick={saveEmail}
              disabled={savingEmail || email.trim() === staff.email}
              className="w-full"
            >
              {savingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Changer
            </Button>
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Adresse email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </Card>

        <Card
          icon={KeyRound}
          title="Mot de passe"
          description="Au moins 6 caractères."
          action={
            <Button
              onClick={savePassword}
              disabled={savingPassword || !password || password !== confirm}
              className="w-full"
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Modifier
            </Button>
          }
        >
          {/* Side by side keeps this card the same height as Nom and Email,
              so the three sit level instead of one running long. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirmer
              </Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          {confirm && password !== confirm ? (
            <p className="mt-2 text-xs text-destructive">
              Les deux mots de passe ne correspondent pas.
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-card">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-[1.05rem] w-[1.05rem]" />
        </span>
        <div>
          <h2 className="text-[0.95rem] font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {children}

      {/* mt-auto lands every card's button on the same baseline, so the row
          reads as one block instead of three ragged ones. */}
      <div className="mt-auto pt-5">{action}</div>
    </section>
  );
}
